
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var session = require('express-session');
var cookieParser = require('cookie-parser');

const { check, validationResult } = require('express-validator');

var app = express();
app.use(express.static('public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(session({
    secret : 'secret',
    resave : false,
    saveUninitialized : false,
}));

app.set('views', __dirname + '/public/views');
app.set('view engine', 'hbs');


app.get('/login',function(req,res){
        var errors = req.session.error;
        var success = req.session.success;
        console.log(errors);
        res.render(path.join(__dirname,'public/views/login.hbs'),{errors:errors,success:success});
});

app.post('/authenticate', function(req, res) {
    var isValid;
    var username = req.body.username;
    var password = req.body.password;
    var credentials = username+":"+password;
    console.log(credentials);
    request.post({
        url:     'http://localhost:8080/Springmvc1/api/students/auth',
        form:    { credentials: credentials }
    }, function(error, response){
        isValid = response.body;
        if(isValid == "true"){
            var user = {username: req.body.username, password: req.body.password};
            req.session.user = user;
            res.redirect("home");
        }else{
            res.redirect("login?error");
        }
    });

});

app.post('/processRegister',[
        // username must be an email
        check('username').isLength({ min: 5 }).withMessage('Username must be at least 5 chars long.'),
        check('password').isLength({ min: 5 }).withMessage('Password must be at least 5 chars long.'),
        check('name').isAlpha().withMessage('Name must be only alphabetical chars.'),
        check('surname').isAlpha().withMessage('Surname must be only alphabetical chars.'),
        check('email').isEmail().withMessage('Email not valid.'),
        check('fathername').isAlpha().withMessage('Father Name must have only alphabetical chars.'),
        check('mothername').isAlpha().withMessage('Mother Name must have only alphabetical chars.'),
        check('university').isAlpha().withMessage('University must have only alphabetical chars.'),
        check('semester').isNumeric().withMessage('Semester must be a number.' ),
    ],
    (req, res ) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const extractedErrors = [];
            errors.array().map(err => extractedErrors.push({'msg': err.msg}));
            req.session.error = extractedErrors;
            req.session.success = false;
            return res.redirect("login#error");
        }

        req.session.error = false;

        //Login data
        var username = req.body.username;
        var password = req.body.password;
        var name = req.body.name;
        var surname = req.body.surname;
        var email = req.body.email;

        //Basic Information
        var fatherName = req.body.fathername;
        var motherName = req.body.mothername;
        var university = req.body.university;
        var department = req.body.department;
        var semester = req.body.semester;

        var json = {
            "name": name,
            "surname": surname,
            "email": email,
            "fatherName": fatherName,
            "motherName": motherName,
            "university": university,
            "department": department,
            "semester": semester,
            "login": {
                "username": username,
                "password": password
            }
        }

        const options = {
            uri: 'http://localhost:8080/Springmvc1/api/students',
            method: 'POST',
            json: json
        };

        request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var saved = response.body;
                console.log(saved);
                if(saved==true) {
                    req.session.success = true;
                    return res.redirect("login#success");
                }
                req.session.success = false;
                req.session.error = [{ 'msg' : 'Username already exists.'}]
                return res.redirect("login#error");
            }
        });

    });



app.all("/*", checkSignIn, function(req, res, next) {
    next(); // if the middleware allowed us to get here,
            // just move on to the next route handler
});


function checkSignIn(req, res , next){
    if(req.session.user){
        return next();
    } else {
        res.redirect("login");
    }
}

//----------------------- HOME
app.get('/home',function(req,res){
    var user = req.session.user.username;
  res.render(path.join(__dirname,'public/views/home.hbs'),{user:user});
});

//------------------------ CREATE
app.get('/create',function(req,res){
    var user = req.session.user.username;
    const options = {
        url: 'http://localhost:8080/Springmvc1/api/students/' + user,
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8'
        }
    };

    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var json = JSON.parse(response.body);
            var active  = json.active;
            if(active){
                var errors = req.session.apperror;
                res.render(path.join(__dirname,'public/views/application.hbs'),{user:user,errors:errors,active:'true'});
            }else{
                res.render(path.join(__dirname,'public/views/application.hbs'),{user:user});
            }

        }
    });

});

//------------------ RANK
app.get('/rank',function(req,res){
    var user = req.session.user.username;
    var isOpen;
    var number;
    const dataoptions = {
        url: 'http://localhost:8080/Springmvc1/api/data' ,
        method: 'GET'
    };
    request(dataoptions, function (error, response) {
        if (!error && response.statusCode == 200) {
            var json = JSON.parse(response.body);
            isOpen = json.open;
            number = json.total * (json.limit / 100);
            console.log(number);
        }
    });


    const options = {
        url: 'http://localhost:8080/Springmvc1/api/students/rank/' + user,
        method: 'GET'
    };
    request(options, function (error, response) {
        if (!error && response.statusCode == 200) {
            var rank = response.body;
            if(rank == 0){
                rank = false;
            }
            if(!isOpen){
                if(rank < number){
                    res.render(path.join(__dirname,'public/views/rank.hbs'),{user:user,rank:false,finish:true});
                }

            }else{
                console.log(rank);
                res.render(path.join(__dirname,'public/views/rank.hbs'),{user:user,rank:rank});
            }

        }
    });


});


app.post('/processApplication',[
        // Express validator
        check('adoption').matches(/^(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[012])[\/\-]\d{4}$/).withMessage('Adoption Day must be a valid date'),
        check('record').isNumeric().withMessage('Record must be a number.' ),
        check('street').isAlpha().withMessage('Street must be only alphabetical chars.'),
        check('number').isNumeric().withMessage('Street Number must be a number.' ),
        check('city').isAlpha().withMessage('City must be only alphabetical chars.'),
        check('postalCode').isNumeric().withMessage('Postal Code must be a number.' ),
        check('telephone').isMobilePhone().withMessage('Telephone must be a phone number.' ),
        check('mobile').isMobilePhone().withMessage('Mobile must be a phone number.' ),
        check('numberOfStudyingBrothers').isNumeric().withMessage('Number of Brothers must be a number.' ),
        check('cityOfUniversity').isAlpha().withMessage('City of University must be only alphabetical chars.'),
        check('income').isNumeric().withMessage('Income must be a number.' ),
        check('familyIncome').isNumeric().withMessage('Family Income must be a number.' )
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const extractedErrors = [];
            errors.array().map(err => extractedErrors.push({ 'msg' : err.msg }));
            req.session.apperror = extractedErrors;
            return res.redirect("create#error");
        }
  //Identification
  var user = req.body.user;
  var dni = req.body.dni;
  var adoption = req.body.adoption;
  var authority = req.body.authority;
  var record = req.body.record;

    //Residence
  var street = req.body.street;
  var number = req.body.number;
  var city = req.body.city;
  var postalCode = req.body.postalCode;
  var telephone = req.body.telephone;
  var mobile = req.body.mobile;

    //Financial
  var numberOfStudyingBrothers = req.body.numberOfStudyingBrothers;
  var cityOfUniversity = req.body.cityOfUniversity;
  var income = req.body.income;
  var familyIncome = req.body.familyIncome;


  //Sended data to be saved
  var json = {

    "identification": {
            "id": dni,
            "adoptionDay": adoption,
            "issuingAuthority": authority,
            "record": record
        },
        "residence": {
            "street": street,
            "number": number,
            "city": city,
            "postalCode": postalCode,
            "telephone": telephone,
            "mobile": mobile
        },
        "application": {
            "id" : 0,
            "cityOfUniversity": cityOfUniversity,
            "numberOfStudyingBrothers": numberOfStudyingBrothers,
            "income": income,
            "familyIncome": familyIncome
        },
        "login":{
          "username" : user
        }
}

const options = {
  uri: 'http://localhost:8080/Springmvc1/api/students/application',
  method: 'PUT',
  json: json
};

request(options, function (error, response, body) {
  if (!error && response.statusCode == 200) {
      return res.redirect("home#success");
  }
});

});

//--------------- UPDATE
app.get('/update',function(req,res){
    var user = req.session.user.username;
    var isOpen = true;
    //Request to get data of from the system
    const dataoptions = {
        url: 'http://localhost:8080/Springmvc1/api/data' ,
        method: 'GET'
    };
    request(dataoptions, function (error, response) {
        if (!error && response.statusCode == 200) {
            var json = JSON.parse(response.body);
            isOpen = json.open;
            console.log(isOpen);
        }
    });

        //Request to get students data
        const options = {
            url: 'http://localhost:8080/Springmvc1/api/students/' + user,
            method: 'GET'
        };

        request(options, function (error, response) {
            if (!error && response.statusCode == 200) {
                var student = response.body;
                var studentjson = JSON.parse(student);
                console.log(student);
                var isSend = studentjson.send;
                if(isSend) {
                    var email = studentjson.email;
                    var telephone = studentjson.residence.telephone;
                    var mobile = studentjson.residence.mobile;

                    var errors = req.session.uerror;

                    if (isOpen) {
                        res.render(path.join(__dirname, 'public/views/update.hbs'), {
                            user: user,
                            open: 1
                        });

                    } else {
                        res.render(path.join(__dirname, 'public/views/update.hbs'), {
                            user: user,
                            email: email,
                            telephone: telephone,
                            mobile: mobile,
                            errors: errors
                        });
                    }
                }else{
                    res.render(path.join(__dirname, 'public/views/update.hbs'), {
                        user: user,
                        open: 1
                    });
                }
            }
        });

});

app.post('/processUpdate',[

        //Express Validator
        check('email').isEmail().withMessage('Email not valid.'),
        check('telephone').isMobilePhone().withMessage('Telephone must be a phone number.'),
        check('mobile').isMobilePhone().withMessage('Mobile must be a phone number.')

    ],
    (req, res ) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const extractedErrors = [];
            errors.array().map(err => extractedErrors.push({'msg': err.msg}));
            req.session.uerror = extractedErrors;
            return res.redirect("update#error");
        }

        var username = req.body.user;
        var email = req.body.email;
        var telephone = req.body.telephone;
        var mobile = req.body.mobile;

        var json = {
            "email": email,
            "residence": {
                "telephone": telephone,
                "mobile": mobile
            },
            "login": {
                "username": username
            }
        };

        const options = {
            uri: 'http://localhost:8080/Springmvc1/api/students',
            method: 'PUT',
            json: json
        };

        request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                return res.redirect("update#success");
            }
        });
    });


app.listen(3000);

console.log('Running at Port 3000');
