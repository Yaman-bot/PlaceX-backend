const express=require('express')
const { check }=require('express-validator')

const { getPlaceById,getPlacesByUserId,createPlace,updatePlace,deletePlace }=require('../controllers/places-controller')
const fileUpload=require('../middleware/file-upload')
const checkAuth=require('../middleware/check-auth')

const router=express.Router();


router.get('/:pid',getPlaceById)

router.get('/users/:uid',getPlacesByUserId)

//Middleware for checking token
router.use(checkAuth)

router.post(
    '/',
    fileUpload.single('image'),
    [
        check('title').not().isEmpty(),
        check('description').isLength({min:5}),
        check('address').not().isEmpty()
    ],
    createPlace
)

router.patch(
    '/:pid',
    [
        check('title').not() .isEmpty(),
        check('description').isLength({ min: 5 })
    ],
    updatePlace
);

router.delete('/:pid', deletePlace);

module.exports=router