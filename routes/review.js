var router = require('express').Router();

router.use(로그인했니);

function 로그인했니(요청, 응답, next) {
  if (요청.user) { next() }
  else { 응답.send('로그인 안하셨는데요?') }
}

router.get('/write', function(요청, 응답){
   응답.render('write.ejs')
});

module.exports = router;