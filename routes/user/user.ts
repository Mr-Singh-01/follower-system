import { Router } from 'express';
import {
  registerUser,
  getAllUsers,
  getUserProfile,
  deleteUser,
  followUser,
  getFollowRequest,
  approveFollowRequest,
  deleteUsers,
  unfollowUser,
} from '../../controller/user/user';

import { protect } from '../../middleware/authMiddleware';
import { privacy } from '../../middleware/userPrivacy';

const router: Router = Router();

router.route('/signup').post(registerUser);
router.route('/users').get(getAllUsers);
router.route('/:username').get(privacy, getUserProfile);

router.route('/delete').delete(deleteUsers);

router.use(protect);

router.route('/account/delete').delete(deleteUser);
router.route('/:username').put(followUser);
router.route('/account/requests').get(getFollowRequest).put(approveFollowRequest);
router.route('/:username').delete(unfollowUser);

export default router;
