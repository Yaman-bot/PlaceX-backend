const HttpError = require("../models/http-error")
const jwt=require('jsonwebtoken')

const checkAuth=(req,res,next)=>{
    if(req.method==='OPTIONS'){
        return next() 
    }
    //Try-catch block if error is generated if authorization header is not set
    try{
        const token=req.headers.authorization.split(' ')[1] //Authorization:"Bearer TOKEN"
        if(!token){
            throw new Error('Authentication failed!!')
        }

        const decodedToken=jwt.verify(token,process.env.JWT_KEY)
        req.userData={userId:decodedToken.userId}
        next();
    }catch(err){
        const error=new HttpError('Authentiction failed!!',401)
        return next(error)
    }
}

module.exports=checkAuth