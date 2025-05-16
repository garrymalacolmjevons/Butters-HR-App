declare module 'passport-microsoft' {
  import passport = require('passport');
  
  export interface Profile {
    id: string;
    displayName: string;
    emails?: { value: string }[];
    name?: {
      familyName: string;
      givenName: string;
    };
    photos?: { value: string }[];
    provider: string;
    _raw: string;
    _json: any;
  }

  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    tenantID?: string;
    scope?: string[];
    prompt?: string;
  }

  export class Strategy implements passport.Strategy {
    constructor(
      options: StrategyOptions,
      verify: (
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: (error: any, user?: any, info?: any) => void
      ) => void
    );
    name: string;
    authenticate(req: Express.Request, options?: any): void;
  }
}