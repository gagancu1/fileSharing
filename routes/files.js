

const router = require('express').Router();

const multer = require('multer');

const path = require('path');

const File = require('../models/file');

const {v4: uuid4} = require('uuid');


let storage = multer.diskStorage({

    destination: (req, file, cb) =>cb(null, 'uploads/'),
    // cb(null, path.join(__dirname, '/uploads/'));
    filename: (req, file, cb) =>{
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
    }
})

let upload = multer({
    storage,
    limit: {filesize: 1000000 * 500 },
}).single('myfile');

router.post('/', (req, res) => {
    //Store File

    upload(req, res, async(err)=>{
    // Validate request
        if(err){
             return res.json({error : err.message});
         }

        if(err){
        return res.status(500).send({error: err.message})
        }

        //Store to DB
        const file = new File({
         filename: req.file.filename,
         uuid: uuid4(),
         path: req.file.path,
         size: req.file.size

        });

        const response = await file.save();
        return res.json({ file: `${process.env.APP_BASE_URL}/files/${response.uuid}`})
});

});

//Send Response -> Link Through Email
router.post('/send', async (req, res) => {
    const {emailFrom, emailTo, uuid } = req.body;
    if(!uuid || !emailTo || !emailFrom) {
        return res.status(422).send({ error: 'All fields are required except expiry.'});
    }
    // Get data from db
    try {
      const file = await File.findOne({ uuid: uuid });
      if(file.sender) {
        return res.status(422).send({ error: 'Email already sent once.'});
      }
      file.sender = emailFrom;
      file.receiver = emailTo;
      const response = await file.save();

      // send mail
      const sendMail = require('../services/mailServices');

      sendMail({
        from: emailFrom,
        to: emailTo,
        subject: 'IndiShare file sharing',
        text: `${emailFrom} shared a file with you.`,
        html: require('../services/emailTemplate')({
                  emailFrom,
                  downloadLink: `${process.env.APP_BASE_URL}/files/${file.uuid}` ,
                  size: parseInt(file.size/1000) + ' KB',
                  expires: '24 hours'
              })
      }).then(() => {
        return res.json({success: true});
      }).catch(err => {
        return res.status(500).json({error: err.message});
      });
  } catch(err) {
    return res.status(500).send({ error: err.message});
  }

  });


module.exports = router;

