import joi from "joi";
let logger = require('../../winston_logger');
logger = logger("validation.ts");

export async function validateInviteBody(object, validateWith, res) {
  const schema = joi.object(object);
  const { error } = schema.validate(validateWith);
  if (error) {
    return res.json({
      status: false,
      message: error.details[0].message,
    });
  }
}

export async function validateRegisterBody(object, validateWith, res) {
  try{

    const schema = joi.object(object);
    const { error } = schema.validate(validateWith);
    if(error){
        return res.json({
            success:false,
            message: error.details[0].message
        })
    }else{
      return true
    }
  }catch (err) {
    // console.log('Error in validateRegisterBody ::',err);
    logger.error("validateRegisterBody: Catch error : ",{
        'body':object, 
        'err':err.message
      }
    );
    return res.json({
        success:false,
        message: err.message
    })
  }   
  
}

export const rawBodySaver = function (req, res, buf, encoding) {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
}
