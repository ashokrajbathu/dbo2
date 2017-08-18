var myapp = angular.module('doctorServices', []);

myapp.service('doctorServices', ['$http', function($http) {
    var getDoctors = function() {
        console.log("in doctors service");
        console.log("doctors--", $http.get('http://54.191.212.94:8080/dbotica-spring/assistant/getMyDoctors'));
        return $http.get('http://54.191.212.94:8080/dbotica-spring/assistant/getMyDoctors');

    }
    return {
        getDoctors: getDoctors
    }
}]);
