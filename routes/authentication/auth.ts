import { Router } from 'express';
import {
  loginUser,
  logout,
  userPrivacy,
  verifyEmail,

} from '../../controller/authentication/auth';

import { protect } from '../../middleware/authMiddleware';

const router = Router();

router.route('/login').post(loginUser);
router.route('/verifyemail').get(verifyEmail);

router.use(protect)

router.route('/logout').get(logout);
router.route('/:username/account/privacy').patch(userPrivacy);


export default router;
