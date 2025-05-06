import nodemailer from 'nodemailer'

const _USER = process.env.EMAIL_USER
const EMAIL_PASS = process.env.EMAIL_PASS
const EMAIL_RECEIVER_1 = process.env.EMAIL_RECEIVER_1

const transporter = nodemailer.createTransport({
  host: 'smtp.qq.com',
  port: 465,
  secure: true,
  auth: {
    user: _USER,
    pass: EMAIL_PASS
  }
})

function sendPowerAlert(subject, content): void {
  transporter.sendMail({
    from: _USER,
    to: EMAIL_RECEIVER_1,
    subject,
    text: content
  })
}

export default sendPowerAlert
