const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended : true}));
const MongoClient = require('mongodb').MongoClient;
app.set('view engine', 'ejs');
app.use('/public', express.static('public'));
const methodOverride = require('method-override')
app.use(methodOverride('_method'))
require('dotenv').config()

var db;
MongoClient.connect(process.env.DB_URL, function(err, client){
    if (err) return console.log(err)
    db = client.db('todoapp');
    app.listen(process.env.PORT, function() {
      console.log('listening on 3306')
    });
});

app.get('/write', function(요청, 응답) {  
    응답.render('write.ejs')
});

app.get('/', function(요청, 응답) {  
    응답.render('index.ejs')
});


app.get('/list', function(요청, 응답) {  
    db.collection('post').find().toArray(function(error, 결과){
        //console.log(결과);
        응답.render('list.ejs', { posts : 결과});
    });
});



app.get('/detail/:id', function(요청, 응답){
    db.collection('post').findOne({ _id : parseInt(요청.params.id) }, function(에러, 결과){
        console.log(결과);
        응답.render('detail.ejs', {data : 결과} )
    })
});

app.get('/edit/:id', function(요청, 응답) {  

    db.collection('post').findOne({_id: parseInt(요청.params.id)}, function(에러, 결과){
        응답.render('edit.ejs', {post : 결과})

    })
});

app.put('/edit', function(요청, 응답){ 
    db.collection('post').updateOne( {_id : parseInt(요청.body.id) }, {$set : { 제목 : 요청.body.title , 날짜 : 요청.body.date }}, 
    function(에러,결과){ 
      console.log('수정완료') 
      응답.redirect('/list') 
    });
});

app.get('/search', (요청, 응답)=>{

  var 검색조건 = [
    {
      $search: {
        index: 'titleSearch',
        text: {
          query: 요청.query.value,
          path: ['제목', '날짜']  // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
        }
      }
    }
  ] 
  console.log(요청.query);
  db.collection('post').aggregate(검색조건).toArray((에러, 결과)=>{
    console.log(결과)
    응답.render('search.ejs', {posts : 결과})
  })
})


const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

app.use(session({secret : '1234', resave : true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session()); 

app.get('/login', function(요청, 응답){
    응답.render('login.ejs')
});

app.get('/register', function(요청, 응답){
  응답.render('register.ejs')
});

app.post('/login', passport.authenticate('local', {failureRedirect : '/fail'}), function(요청, 응답){
    응답.redirect('/')
});


app.get('/mypage',로그인했니, function (요청, 응답) {
    응답.render('mypage.ejs', {})
});


function 로그인했니(요청, 응답, next) { 
    if (요청.user) { 
      next() 
    } else { 
      응답.send('로그인 안 하셨는데요?') 
    } 
  } 

passport.use(new LocalStrategy({
    usernameField: 'id', //(여기는 사용자가 제출한 아이디가 어디 적혔는지) 
    passwordField: 'pw', //(여기는 사용자가 제출한 비번이 어디 적혔는지) 
    session: true, //(요기는 세션을 만들건지) 
    passReqToCallback: false, //(요기는 아이디/비번말고 다른 정보검사가 필요한지) 
  }, function (입력한아이디, 입력한비번, done) {
    //console.log(입력한아이디, 입력한비번);
    db.collection('login').findOne({ id: 입력한아이디 }, function (에러, 결과) {
      if (에러) return done(에러)

      if (!결과) return done(null, false, { message: '존재하지않는 아이디요' })
      if (입력한비번 == 결과.pw) {
        return done(null, 결과)
      } else {
        console.log('비번틀림');
        return done(null, false, { message: '비번틀렸어요' })
      }
    })
  }));

passport.serializeUser(function (user, done) {
    done(null, user.id)
});
  
passport.deserializeUser(function (아이디, done) {
  db.collection('login').findOne({ id: 아이디 }, function (에러, 결과){
    done(null, 결과)
  })
}); 

app.post('/register', function (요청, 응답) {
  db.collection('login').insertOne({ id: 요청.body.id, pw: 요청.body.pw }, function (에러, 결과) {
    응답.redirect('/')
  })
})

//폼에서 add로 post요청하면
app.post('/add', function (요청, 응답) {

  응답.send('전송완료');
  //db 안의 총 게시물 갯수를 찾음
  db.collection('counter').findOne({ name: '게시물갯수' }, function (에러, 결과) {
    console.log(결과.totalPost)
    //총 게시물 갯수를 변수에 저장
    var 총게시물갯수 = 결과.totalPost;

    var post = { _id: 총게시물갯수 + 1, 작성자: 요청.user._id , 제목: 요청.body.title, 날짜: 요청.body.date }

    //db.post에 새 게시물 기록함
    db.collection('post').insertOne( post , function (에러, 결과) {
      console.log('저장완료')
      db.collection('counter').updateOne({ name: '게시물갯수' }, { $inc: { totalPost: 1 } }, function (에러, 결과) {
        if (에러) { return console.log(에러) } //완료 되면 db.counter 안의 총 게시물 갯수가 하나 증가
      })
    });
  });
});

//게시물 삭제
app.delete('/delete', function (요청, 응답) {
  console.log('삭제요청들어옴');
  console.log(요청.body);
  요청.body._id = parseInt(요청.body._id);

  var 삭제할데이터 = { _id : 요청.body._id, 작성자 : 요청.user._id};

  //요청.body에 담겨온 게시물번호를 가진 글을 db에서 찾아서 삭제해주세요
  db.collection('post').deleteOne(삭제할데이터, function (에러, 결과) {
    console.log('삭제완료');
    if (에러) {console.log(에러)}
    응답.status(200).send({ message: '성공했습니다' });
  })
});


app.use('/review', require('./routes/review.js'));

app.get('/upload', function(요청, 응답){
  응답.render('upload.ejs')
});  

app.get('/settings', function(요청, 응답){
  응답.render('settings.ejs')
});

app.get('/menu-ranking', function(요청, 응답){
  응답.render('menu-ranking.ejs')
});