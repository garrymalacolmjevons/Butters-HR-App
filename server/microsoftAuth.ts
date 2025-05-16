import { Issuer, Strategy as OpenIDStrategy, type VerifyFunction } from "openid-client";
import passport from "passport";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import { storage } from "./storage";

// Ensure we have all required environment variables
if (!process.env.MICROSOFT_CLIENT_ID || 
    !process.env.MICROSOFT_CLIENT_SECRET || 
    !process.env.MICROSOFT_TENANT_ID) {
  throw new Error("Missing Microsoft environment variables");
}

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

// Microsoft Azure AD OpenID Connect discovery URL
const DISCOVERY_URL = `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/v2.0/.well-known/openid-configuration`;

// Use memoize to cache the OpenID configuration
const getMicrosoftOidcConfig = memoize(
  async () => {
    return await Issuer.discover(DISCOVERY_URL);
  },
  { maxAge: 3600 * 1000 } // Cache for 1 hour
);

// Function to update user session with tokens and claims
function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

// Upsert user in the database based on Microsoft claims
async function upsertUser(claims: any) {
  // Need to check and format the claims to match our user schema
  const msEmail = claims.email || claims.preferred_username || '';
  const msName = claims.name || '';
  const nameParts = msName.split(' ');
  const msFirstName = claims.given_name || (nameParts.length > 0 ? nameParts[0] : '');
  const msLastName = claims.family_name || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
  
  // Generate a unique username from email or sub
  const username = msEmail.split('@')[0] || `user_${claims.sub.substring(0, 8)}`;
  
  // Check if user already exists by ID
  let existingUser;
  try {
    existingUser = await storage.getUser(claims.sub);
  } catch (error) {
    // If ID-based lookup fails, try username
    try {
      existingUser = await storage.getUserByUsername(username);
    } catch (err) {
      existingUser = undefined;
    }
  }
  
  if (existingUser) {
    // User exists, update their info
    return existingUser;
  } else {
    // Create new user with mandatory fields
    return await storage.createUser({
      username: username,
      password: Math.random().toString(36).substring(2, 15), // Generate a random password
      fullName: msName || `${msFirstName} ${msLastName}`.trim(),
      email: msEmail,
      isAdmin: false,
      role: 'Viewer', // Default role for new users
      active: true
    });
  }
}

// Setup Microsoft authentication
export async function setupMicrosoftAuth(app: Express) {
  const config = await getMicrosoftOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      const user = {};
      updateUserSession(user, tokens);
      
      // Save or update user in database
      await upsertUser(tokens.claims());
      
      verified(null, user);
    } catch (error) {
      console.error("Error during Microsoft authentication:", error);
      verified(error as Error);
    }
  };

  // Create Microsoft auth strategy for each domain
  for (const domain of process.env.REPLIT_DOMAINS!.split(",")) {
    const client_id = process.env.MICROSOFT_CLIENT_ID!;
    const client_secret = process.env.MICROSOFT_CLIENT_SECRET!;
    
    // Create client
    const microsoftClient = new config.Client({
      client_id,
      client_secret,
      redirect_uris: [`https://${domain}/api/auth/microsoft/callback`],
      response_types: ['code'],
    });

    // Create strategy
    const strategy = new Strategy(
      {
        client: microsoftClient,
        params: {
          scope: 'openid email profile offline_access',
        }
      },
      verify
    );

    passport.use(`microsoft:${domain}`, strategy);
  }

  // Microsoft login route
  app.get("/api/auth/microsoft", (req, res, next) => {
    passport.authenticate(`microsoft:${req.hostname}`, {
      prompt: 'select_account', // Always show account selection
    })(req, res, next);
  });

  // Microsoft callback route
  app.get("/api/auth/microsoft/callback", (req, res, next) => {
    passport.authenticate(`microsoft:${req.hostname}`, {
      successRedirect: "/",
      failureRedirect: "/login",
    })(req, res, next);
  });
}

// Middleware to check if token needs refreshing
export const refreshMicrosoftToken: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!user || !user.expires_at) {
    return next();
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return next();
  }

  try {
    const config = await getMicrosoftOidcConfig();
    const microsoftClient = new config.Client({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
    });

    const tokenSet = await microsoftClient.refresh(refreshToken);
    updateUserSession(user, tokenSet);
    next();
  } catch (error) {
    console.error("Error refreshing Microsoft token:", error);
    next();
  }
};