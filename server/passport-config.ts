import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import { storage } from './storage';
import type { Express } from 'express';

// Configure passport authentication
export function configurePassport(app: Express) {
  // Local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        if (!user.active) {
          return done(null, false, { message: "User account is disabled" });
        }
        
        // Simple password check for development
        // In production, you would use bcrypt.compare or similar
        if (user.password !== password) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  // Microsoft strategy
  if (process.env.MICROSOFT_CLIENT_ID && 
      process.env.MICROSOFT_CLIENT_SECRET && 
      process.env.MICROSOFT_TENANT_ID) {
    
    // Domain information for callbacks
    const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
    const protocol = domain === 'localhost:5000' ? 'http' : 'https';
    const callbackURL = `${protocol}://${domain}/api/auth/microsoft/callback`;
    
    passport.use(
      new MicrosoftStrategy(
        {
          clientID: process.env.MICROSOFT_CLIENT_ID,
          clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
          tenantID: process.env.MICROSOFT_TENANT_ID,
          callbackURL: callbackURL,
          scope: ['user.read', 'profile', 'email', 'openid'],
        },
        async (accessToken, refreshToken, profile, done) => {
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
        }
      )
    );
    
    console.log('Microsoft authentication configured successfully');
  }

  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication routes
  app.get('/api/auth/microsoft',
    passport.authenticate('microsoft', { prompt: 'select_account' })
  );

  app.get('/api/auth/microsoft/callback',
    passport.authenticate('microsoft', {
      successRedirect: '/',
      failureRedirect: '/login',
    })
  );

  // Logout route
  app.get('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Error during logout:', err);
      }
      res.redirect('/login');
    });
  });
}