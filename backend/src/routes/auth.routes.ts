import express from 'express';
import passport from '../config/passport.js';
import { googleOauthController } from '../controller/auth.controller.js';

const router: any = express.Router();

router.get(
    '/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false,
    })
);

router.get('/google/callback', googleOauthController)


export default router;