/* モジュール読み込み */
var express		= require('express');
var routes		= require('./routes');
var user		= require('./routes/user');
var http		= require('http');
var path		= require('path');
var socketio	= require("socket.io");
var mongoose	= require("mongoose");
var setting		= require("./conf.js");

// スキーマの定義
var Schema		= mongoose.Schema;
// MongoDBに保存するデータ型を設定
var UserSchema	= new Schema({
	message: String,
	date: Date
});
mongoose.model('User', UserSchema);
// MongoDBに接続
// mongodb://[ホスト名]/[DB名]
mongoose.connect('mongodb://' + setting.DB_IP + '/' + setting.DB_NAME);

var db	= mongoose.connection;
// mongoDB接続時のエラーハンドリング
db.on('error', console.error.bind(console, 'connection error:'));
var User;
db.once('open', function() {
	// 定義したときの登録名で呼び出し
	User = mongoose.model('User');
	//	populateDB();
});

var app = express();

// all environments
app.set('port', setting.PORT);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
}

app.get('/', routes.index);

/* サーバの作成 */
var server	= http.createServer(app).listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});
var io		= socketio.listen(server);

/*
 * 通信時の処理
 * クライアント側がio.connect()を実行すると、サーバの以下処理が実行される(イベント名：connection)
 */

io.sockets.on("connection", function (socket) {

	//接続したらDBのメッセージを表示
	User.find(function(err, docs){
		socket.emit('msg open', docs);	//返って来た値をemitする
	});

	// クライアントがチャット送信時に発したイベントの受信処理
	socket.on('msg send', function (msg) {
		socket.emit('msg push', msg);
		socket.broadcast.emit('msg push', msg);
		//DBに登録
		var user		= new User();
		user.message	= msg;
		user.date		= new Date();
		user.save(function(err) {
			if (err) { console.log(err); }
		});
	});

	// 接続が終了した
	socket.on("disconnect", function (cliant) {
		console.log('disconnected');
	});

});
