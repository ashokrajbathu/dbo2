var myapp = angular.module('doctorServices', []);

myapp.service('doctorServices', ['$http', function($http) {
    var getDoctors = function() {
        console.log("in doctors service");
        console.log("doctors--", $http.get('http://34.211.209.156:8080/dbotica-spring/assistant/getMyDoctors'));
        return $http.get('http://34.211.209.156:8080/dbotica-spring/assistant/getMyDoctors');

    }
    return {
        getDoctors: getDoctors
    }
}]);
