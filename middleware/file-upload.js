const multer=require('multer')
const {v4 : uuidv4}=require('uuid')

const MIME_TYPE_MAP={
    'image/png':'png',
    'image/jpeg':'jpeg',
    'image/jpg':'jpg'
}

const fileUpload=multer({
    limits:500000,
    storage:multer.diskStorage({
        destination:(req,file,cb)=>{
            cb(null,'uploads/images')
        },
        filename:(req,file,cb)=>{
            //Extracting the extension
            const ext=MIME_TYPE_MAP[file.mimetype]
            cb(null,uuidv4() + '.' + ext)
        },
        fileFilter:(req,file,cb)=>{
            // !! coverts undefined to false and any other value to true 
            const isValid=!!MIME_TYPE_MAP[file.mimetype]
            let error=isValid ? null : new Error('Invalid mime type')
            cb(error,isValid)
        }
    })
})

module.exports=fileUpload