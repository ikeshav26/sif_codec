import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import passport from 'passport';
import dotenv from 'dotenv';
import { prisma } from './db.js';

dotenv.config();

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            callbackURL: `${process.env.API_URL}/auth/google/callback`,
            scope: ['profile', 'email'],
        },
        async (accessToken: string, refreshToken: string, profile: any, done: Function) => {
            try {
                const email =
                    profile.emails && profile.emails.length > 0
                        ? profile.emails[0].value
                        : null;
                const avatarUrl =
                    profile.photos && profile.photos.length > 0
                        ? profile.photos[0].value
                        : null;

                if (!email) {
                    return done(new Error('No email provided by Google'), null);
                }

                let user = await prisma.user.findUnique({
                    where: {
                        providerId: profile.id,
                    },
                });

                if (user) {
                    if (avatarUrl) {
                        user = await prisma.user.update({
                            where: { providerId: profile.id },
                            data: { avatarUrl: avatarUrl },
                        });
                    }
                } else {
                    user = await prisma.user.create({
                        data: {
                            name: profile.displayName || email.split('@')[0],
                            email: email,
                            providerId: profile.id,
                            avatarUrl: avatarUrl || '',
                        },
                    });
                }

                return done(null, user);
            } catch (err) {
                console.error('Google OAuth error', err);
                return done(err, null);
            }
        }
    )
);

export default passport;