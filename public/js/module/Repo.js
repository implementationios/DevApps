function getUdid() {
  var result = '';
  var persistedUDID = Storage.get('udid');
  if (persistedUDID){
    result = persistedUDID;
  } else {
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for ( var i = 0; i < 10; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * 10));
    }
    Storage.set('udid', result);
  }
  return result;
}

// class Repo {
//   constructor() {
//   }
//   static getInstance() {
//     if (Repo.instance) {
//       return Repo.instance;
//     }
//     Repo.instance = new Repo();
//     return Repo.instance;
//   }

//   // Client config

//   loadClientConfig(callback, errorCallback){
//     cv.get_result({f: 'getClientConfig'},'getClientConfigCalllback'
//     , function(result){
//       try {
//         if (result.answer.subscriber){
//           var userName = result.answer.subscriber.firstName + ' ' + result.answer.subscriber.lastName;
//           var userBalance = result.answer.subscriber.purse;
//           if (userBalance > 0){
//             userBalance = userBalance / 100;
//           }
//           var userModel = new UserModel(userName, userBalance);
//           // In order to avoid calling the API all the time, persist whatever you can
//           localStorage.setItem('clientConfig', JSON.stringify(userModel));
//           callback(userModel);
//         }
//       }
//       catch(err) {
//         errorCallback(err);
//       }
//     }, function(result){
//       errorCallback(result.errorMessage);
//     });
//   }

//   get getClientConfigUserModel() {
//     var result = null;
//     var s = localStorage.getItem('clientConfig');
//     if (s){
//       result = JSON.parse(s);
//     }
//     return result;
//   }

//   // Client config

//   get getUdid() {
//     var result = '';
//     var persistedUDID = localStorage.getItem('udid');
//     if (persistedUDID){
//       result = persistedUDID;
//     } else {
//       var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
//       for ( var i = 0; i < 10; i++ ) {
//           result += characters.charAt(Math.floor(Math.random() * 10));
//       }
//       localStorage.setItem('udid', result);
//     }
//     return result;
//   }
  
// }


// class UserModel{
//   constructor(name, balance) {
//     this.name = name;
//     this.balance = balance;
//     // ToDo: Implement the rest
//   }
// }
