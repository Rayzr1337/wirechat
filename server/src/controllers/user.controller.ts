import type { Request, Response } from 'express';
import * as usersService from '../services/user.service';
import type {
    UpdateProfileBody,
    ChangePasswordBody,
    RequestEmailChangeBody,
} from '../schemas/user.schema';

export async function getMe(req: Request, res: Response) {
    const userId = req.user!.userId;
    const user = await usersService.getUserById(userId);
    res.json({ id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl, emailVerified: user.emailVerified });
}

export async function updateProfile(req: Request<{}, {}, UpdateProfileBody>, res: Response) {
    const userId = req.user!.userId;
    const updated = await usersService.updateUser(userId, req.body);
    res.json({ id: updated.id, username: updated.username, avatarUrl: updated.avatarUrl });
}

export async function changePassword(req: Request<{}, {}, ChangePasswordBody>, res: Response) {
    const userId = req.user!.userId;
    const { oldPassword, newPassword } = req.body;
    await usersService.changePassword(userId, oldPassword, newPassword);
    res.json({ message: 'Password changed successfully.' });
}

export async function requestEmailChange(req: Request<{}, {}, RequestEmailChangeBody>, res: Response) {
    const userId = req.user!.userId;
    const { newEmail } = req.body;
    await usersService.requestEmailChange(userId, newEmail);
    res.json({ message: 'Verification email sent to new address.' });
}

