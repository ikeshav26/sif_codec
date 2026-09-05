import type { Request, Response } from "express";
import passport from '../config/passport.js';
import jwt from 'jsonwebtoken'

export const googleOauthController = (req: Request, res: Response, next: Function) => {
    try {
        passport.authenticate('google', { session: false }, (err: Error, user: any) => {
            if (err) {
                console.error('Google OAuth error', err);
                return res.redirect(
                    `${process.env.CLIENT_URL}/login?error=oauth_failed&message="Authentication failed"`
                );
            }

            if (!user) {
                return res.redirect(
                    `${process.env.CLIENT_URL}/login?error=oauth_failed&message="No user found"`
                );
            }

            const token = generateToken(user.id);

            res.redirect(
                `${process.env.CLIENT_URL}/?oauth=success&token=${encodeURIComponent(token)}&user=${encodeURIComponent(JSON.stringify({ userId: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl }))}`
            );
        })(req, res, next);
    } catch (err) {
        console.error('OAuth Controller error', err);
        return res.redirect(
            `${process.env.CLIENT_URL}/?error=oauth_failed&message="Internal server error"`
        );
    }
};

export const setTokenCookie = (req: Request, res: Response) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: "Token required" });
        }

        res.cookie("token", token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            sameSite: "lax"
        });

        return res.status(200).json({ message: "Token set in cookie" });
    } catch (err) {
        return res.status(500).json({ error: "Failed to set cookie" });
    }
};

export const generateToken = (userId: any) => {
    try {
        const token = jwt.sign({ id: userId }, process.env.JWT_SECRET!, {
            expiresIn: '7d',
        });
        return token;
    } catch (err) {
        throw new Error('Token generation failed');
    }
};