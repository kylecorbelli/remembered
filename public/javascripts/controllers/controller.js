'use strict';

angular.element(document).ready(function() {
    // Close the dropdown button upon selecting a dropdown option:
    $('.nav a').on('click', function() {
        $('.navbar-toggle').click();
    });
});

var loginApp = angular.module('loginApp', []);

loginApp.controller('loginCtrl', function($scope, $http) {

    $scope.todaysDate = new Date();

    $scope.login = function() {
        $http
            .post('/login', $scope.loginInfo)
            .success(function(data) {
                if (data.loginError) {
                    $scope.loginError = data.loginError;
                    $scope.badLogin = true;
                } else {
                    $scope.session = data;
                    $scope.badLogin = false;
                    $scope.loginFlag = false;
                    $scope.showMain = true;
                }
            })
            .error(function(err) {
                console.error(err);
            });
    };

    $scope.signUp = function() {
        $http
            .post('/signup', $scope.newUser)
            .success(function(data) {
                if (data.signUpError) {
                    $scope.signUpError = data.signUpError;
                    $scope.badSignUp = true;
                } else {
                    $scope.session = data;
                    $scope.signUpError = false;
                    $scope.badLogin = false;
                    $scope.signUpFlag = false;
                    $scope.showMain = true;
                }
            })
            .error(function(err) {
                console.error(err);
            });
    };

    $scope.showMain = true;

    $scope.startLogin = function() {
        $scope.loginFlag = true;
        $scope.showMain = false;
        $scope.signUpFlag = false;
    };

    $scope.startSignUp = function() {
        $scope.signUpFlag = true;
        $scope.showMain = false;
        $scope.loginFlag = false;
    };

    $scope.logout = function() {
        $http
            .get('/logout')
            .success(function(data) {
                $scope.session = data;
            })
            .error(function(err) {
                console.error(err);
            });
    };

    var updateSession = function() {
        $http
            .get('/updatesession')
            .success(function(data) {
                $scope.session = data;
            })
            .error(function(err) {
                console.error(err);
            });
    }

    updateSession();

    $scope.addItem = function() {
        $http
            .post('/additem', {itemToAdd: $scope.itemToAdd})
            .success(function(data) {
                updateSession();
                $scope.itemToAdd = '';
                document.getElementById('itemToAddInput').focus();
            })
            .error(function(err) {
                console.error(err);
            });
    };

    $scope.selectedItem = [];

    $scope.selectItem = function(item) {
        $scope.selectedItem[item] = true;
    };

    $scope.deselectItem = function(item) {
        $scope.selectedItem[item] = false;
    };

    $scope.removeItem = function(item) {
        $http
            .post('/removeitem', {
                itemToRemove: item
            })
            .success(function(data) {
                updateSession();
            })
            .error(function(err) {
                console.error(err);
            });
    };

    $scope.forgotPasswordFlag = false;

    $scope.forgotPassword = function() {
        $scope.forgotPasswordFlag = true;
    };

    $scope.rememberedPassword = function() {
        $scope.forgotPasswordFlag = false;
    };

    $scope.emailPassword = function() {
        $http
            .post('/emailpassword', {forgotPasswordEmail: $scope.forgotPasswordEmail})
            .success(function(data) {
                if (data.errorFlag) {
                    delete data.errorFlag;
                    $scope.forgotPassError = data.emailError;
                } else {
                    $scope.forgotPassSuccess = data.message;
                }
            })
            .error(function(err) {
                console.error(err);
            });
    }

    var tempEditSettings = {};

    $scope.startEditSettings = function() {
        tempEditSettings.firstName = $scope.session.firstName;
        tempEditSettings.email = $scope.session.email;
        $scope.editingSettings = true;
        $scope.changePassSuccess = '';
        $scope.changePassErrors = '';
        $scope.updateSettingsSuccess = '';
        $scope.updateSettingsErrors = '';
    };

    $scope.cancelEditSettings = function() {
        $scope.session.firstName = tempEditSettings.firstName;
        $scope.session.email = tempEditSettings.email;
        $scope.editingSettings = false;
        $scope.updateSettingsErrors = '';
        $scope.settingsConfirmPass = '';
    };

    $scope.saveEditSettings = function() {
        var data = {
            _id: $scope.session._id,
            firstName: $scope.session.firstName,
            email: $scope.session.email,
            password: $scope.settingsConfirmPass
        };
        $http
            .post('/updatesettings', data)
            .success(function(data) {
                if (data.errorFlag) {
                    delete data.errorFlag;
                    $scope.updateSettingsErrors = data;
                } else {
                    $scope.editingSettings = false;
                    $scope.settingsConfirmPass = '';
                    $scope.updateSettingsSuccess = data.message;
                    updateSession();
                    $scope.updateSettingsErrors = '';
                }
            })
            .error(function(err) {
                console.error(err);
            });
    };

    $scope.startChangingPassword = function() {
        $scope.changingPassword = true;
        $scope.changePassSuccess = '';
        $scope.changePassErrors = '';
        $scope.updateSettingsSuccess = '';
        $scope.updateSettingsErrors = '';
    };

    $scope.cancelChangingPassword = function() {
        $scope.changingPassword = false;
        $scope.changePassCurrPass = '';
        $scope.changePassNewPass = '';
        $scope.changePassConfPass = '';
        $scope.changePassSuccess = '';
        $scope.changePassErrors = '';
    };

    $scope.saveChangingPassword = function() {
        var postData = {
            "_id": $scope.session._id,
            "changePassCurrPass": $scope.changePassCurrPass,
            "changePassNewPass": $scope.changePassNewPass,
            "changePassConfPass": $scope.changePassConfPass
        };
        $http
            .post('/changepassword', postData)
            .success(function(data) {
                if (data.errorFlag) {
                    delete data.errorFlag;
                    $scope.changePassErrors = data.passwordError;
                } else {
                    $scope.changePassSuccess = data.message;
                    $scope.changingPassword = false;
                    $scope.changePassCurrPass = '';
                    $scope.changePassNewPass = '';
                    $scope.changePassConfPass = '';
                    $scope.changePassErrors = '';
                }
            })
            .error(function(err) {
                console.error(err);
            });
    };

    $scope.startDeletingAccount = function() {
        $scope.deletingAccount = true;
    };

    $scope.cancelDeletingAccount = function() {
        $scope.deletingAccount = false;
    };

    $scope.saveDeletingAccount = function() {
        var postData = {
            password: $scope.deletePass
        };
        $http
            .post('/deleteaccount', postData)
            .success(function(data) {
                if (data.errorFlag) {
                    delete data.errorFlag;
                    $scope.deleteAccountError = data.passwordError;
                } else {
                    $scope.deletingAccount = false;
                    $scope.deleteAccountError = '';
                    $scope.session = {};
                    document.location.href = '/accountdeleted';
                }
            })
            .error(function(err) {
                console.error(err);
            });
    };

});