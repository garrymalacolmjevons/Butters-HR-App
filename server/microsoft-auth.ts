import passport from 'passport';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import { storage } from './storage';
import type { Express } from 'express';

// Microsoft Authentication Configuration
export function configureMicrosoftAuth(app: Express) {
  // Ensure that required environment variables are set
  if (!process.env.MICROSOFT_CLIENT_ID ||
      !process.env.MICROSOFT_CLIENT_SECRET ||
      !process.env.MICROSOFT_TENANT_ID) {
    console.error('Microsoft SSO requires environment variables: MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID');
    return;
  }

  // Domain information for callbacks
  const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
  const protocol = domain === 'localhost:5000' ? 'http' : 'https';
  const callbackURL = `${protocol}://${domain}/api/auth/microsoft/callback`;

  // Configure the Microsoft strategy for use by Passport
  passport.use(new MicrosoftStrategy({
    clientID: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    tenantID: process.env.MICROSOFT_TENANT_ID,
    callbackURL: callbackURL,
    scope: ['user.read', 'profile', 'email', 'openid'],
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Extract user information from Microsoft profile
      const userEmail = profile.emails?.[0]?.value || '';
      const displayName = profile.displayName || '';
      const nameParts = displayName.split(' ');
      const firstName = profile.name?.givenName || (nameParts.length > 0 ? nameParts[0] : '');
      const lastName = profile.name?.familyName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
      
      // Generate a unique username from email or profile ID
      const username = userEmail.split('@')[0] || `user_${profile.id.substring(0, 8)}`;
      
      // Check if the user already exists
      let user;
      try {
        // Try finding by username first
        user = await storage.getUserByUsername(username);
      } catch (error) {
        user = undefined;
      }
      
      if (!user) {
        // Create a new user
        user = await storage.createUser({
          username: username,
          password: Math.random().toString(36).substring(2, 15), // Generate a random password
          fullName: displayName || `${firstName} ${lastName}`.trim(),
          email: userEmail,
          isAdmin: false,
          role: 'Viewer', // Default role for new users
          active: true
        });
        
        console.log(`Created new user from Microsoft login: ${username}`);
      }
      
      return done(null, user);
    } catch (error) {
      console.error('Error processing Microsoft authentication:', error);
      return done(error as Error);
    }
  }));

  // Microsoft login routes
  app.get('/api/auth/microsoft',
    passport.authenticate('microsoft', { prompt: 'select_account' })
  );

  app.get('/api/auth/microsoft/callback',
    passport.authenticate('microsoft', {
      successRedirect: '/',
      failureRedirect: '/login',
      failureFlash: true
    })
  );

  console.log('Microsoft authentication configured successfully');
}