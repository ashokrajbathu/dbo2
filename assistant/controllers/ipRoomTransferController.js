angular.module('personalAssistant').controller('ipRoomTransferController', ipRoomTransferController);
ipRoomTransferController.$inject = ['$scope', '$log', 'dboticaServices', '$state', '$parse', '$http', '$timeout', 'SweetAlert', 'doctorServices'];
/*< -- -- -- -- -- -- - issue with transfer patient-- -- -- -- -- -- - >
 */
function ipRoomTransferController($scope, $log, dboticaServices, $state, $http, $parse, $timeout, doctorServices, SweetAlert) {
    var ipRoom = this;
    ipRoom.transferPatientNew = transferPatientNew;
    ipRoom.timeChangeInTxtBox = timeChangeInTxtBox;
    ipRoom.selectedRoomCategoryInModal = selectedRoomCategoryInModal;
    ipRoom.selectedRoomNameInModal = selectedRoomNameInModal;
    ipRoom.selectedBedNameInModal = selectedBedNameInModal;
    ipRoom.roomTransferOfPatient = roomTransferOfPatient;
    ipRoom.getData = getData;

    angular.element("#inputRoomIpDate").datepicker({
        dateFormat: "dd/mm/yy",
        autoclose: true
    });

    angular.element("#nextChangeDate").datepicker({
        dateFormat: "dd/mm/yy",
        autoclose: true,
        'minDate': 0
    });

    var billInvoice = {};
    dboticaServices.setInvoice(billInvoice);


    ipRoom.mytime = new Date();
    ipRoom.hstep = 1;
    ipRoom.mstep = 1;
    ipRoom.options = {
        hstep: [1, 2, 3],
        mstep: [1, 5, 10, 15, 25, 30]
    };
    ipRoom.ismeridian = true;
    /*ipRoom.dateToolTip = false;*/
    ipRoom.roomCategoryToolTip = false;
    ipRoom.roomNumberToolTip = false;
    ipRoom.bedNumberToolTip = false;
    var roomsFromApi = [];
    var bedsFromApi = [];
    var nextBedId;
    var nextBedNumber;
    var activeRoomNumber;
    var activeFloorNumber;
    var activeRoomCategoryName;
    ipRoom.bedsToBeDisplayed = [];
    ipRoom.roomsToBeDisplayedList = [];
    ipRoom.roomCategoriesToBeDisplayed = [];
    ipRoom.transfersListToBeDisplayed = [];
    ipRoom.transferPatient = {};

    var roomCategoryObject = { 'roomType': '-Room Type-' };
    var roomObject = { 'roomNo': '-Room Name-' };
    var bedObject = { 'bedNo': '-Bed Number-' };
    ipRoom.roomCategoryNameInModal = '-Room Type-';
    ipRoom.roomNumNameInModal = '-Room Name-';
    ipRoom.bedNumNameInModal = '-Bed Number-';
    var loggedInAss = localStorage.getItem('assistantCurrentlyLoggedIn');
    loggedInAss = angular.fromJson(loggedInAss);
    ipRoom.assistantName = loggedInAss.firstName;

    var date = new Date();
    var dateSorted = moment(date).format("DD/MM/YYYY,hh:mm A");
    var timeArray = dateSorted.split(',');
    ipRoom.transferPatient.transferDate = timeArray[0];
    ipRoom.transferPatient.transferTime = timeArray[1];

    var activeInpatient = {};

    function getData() {
        activeInpatient = dboticaServices.getInpatient();
        ipRoom.transfersListToBeDisplayed = [];
        $log.log('active inpatient is---', activeInpatient);
        ipRoom.transfersListToBeDisplayed = dboticaServices.getTransfersArray();
        $log.log('transfers list is---', ipRoom.transfersListToBeDisplayed);
        return true;
    }

    var organizationId = localStorage.getItem('orgId');

    var roomsPromise = dboticaServices.getRooms(organizationId);
    roomsPromise.then(function(roomsSuccess) {
        var errorCode = roomsSuccess.data.errorCode;
        if (errorCode) {
            dboticaServices.logoutFromThePage(errorCode);
        } else {
            var roomsSuccessResponse = angular.fromJson(roomsSuccess.data.response);
            roomsFromApi = _.filter(roomsSuccessResponse, function(entity) {
                return entity.state == 'ACTIVE';
            });
        }
        $log.log('rooms to be displayed are----', roomsFromApi);
        ipRoom.roomsToBeDisplayedList.unshift(roomObject);
    }, function(roomsError) {
        dboticaServices.noConnectivityError();
    });

    var getRoomCategoryPromise = dboticaServices.getRoomCategories(organizationId);
    getRoomCategoryPromise.then(function(roomCategoriesSuccess) {
        var errorCode = roomCategoriesSuccess.data.errorCode;
        if (errorCode) {
            dboticaServices.logoutFromThePage(errorCode);
        } else {
            roomCategoriesSuccessResponse = angular.fromJson(roomCategoriesSuccess.data.response);
            ipRoom.roomCategoriesToBeDisplayed = _.filter(roomCategoriesSuccessResponse, function(entity) {
                return entity.state == 'ACTIVE';
            });
        }
        ipRoom.roomCategoriesToBeDisplayed.unshift(roomCategoryObject);
        $log.log('room categories to be displayed are---', ipRoom.roomCategoriesToBeDisplayed);
    }, function(roomCategoriesError) {
        dboticaServices.noConnectivityError();
    });

    var bedsInRoomPromise = dboticaServices.getBeds(organizationId);
    bedsInRoomPromise.then(function(bedInRoomSuccess) {
        var errorCode = bedInRoomSuccess.data.errorCode;
        if (errorCode) {
            dboticaServices.logoutFromThePage(errorCode);
        } else {
            bedInRoomSuccessResponse = angular.fromJson(bedInRoomSuccess.data.response);
            bedsFromApi = _.filter(bedInRoomSuccessResponse, function(entity) {
                return entity.bedState == 'ACTIVE';
            });
        }
        $log.log('beds list to be displayed are---', bedsFromApi);
        ipRoom.bedsToBeDisplayed.unshift(bedObject);
    }, function(bedInRoomError) {
        dboticaServices.noConnectivityError();
    });

    function transferPatientNew() {

    }

    function selectedRoomCategoryInModal(roomCategoryEntity) {
        $log.log('room category entity is---', roomCategoryEntity);
        ipRoom.roomCategoryNameInModal = roomCategoryEntity.roomType;
        if (roomCategoryEntity.roomType == '-Room Type-') {
            ipRoom.roomsToBeDisplayedList = [];
            ipRoom.bedsToBeDisplayed = [];
            ipRoom.bedNumNameInModal = '-Bed Number-';
            ipRoom.roomNumNameInModal = '-Room Name-';
            ipRoom.bedsToBeDisplayed.unshift(bedObject);
            ipRoom.roomsToBeDisplayedList.unshift(roomObject);
        } else {
            activeRoomCategoryName = roomCategoryEntity.roomType;
            ipRoom.roomsToBeDisplayedList = [];
            var localRoomsOfACategory = [];
            localRoomsOfACategory = _.filter(roomsFromApi, function(entity) {
                return entity.organizationRoomCategoryId == roomCategoryEntity.id;
            });
            angular.copy(localRoomsOfACategory, ipRoom.roomsToBeDisplayedList);
            ipRoom.roomsToBeDisplayedList.unshift(roomObject);
            ipRoom.roomNumNameInModal = '-Room Name-';
        }
    }

    function selectedRoomNameInModal(roomEntity) {
        $log.log('room entity is----', roomEntity);
        ipRoom.roomNumNameInModal = roomEntity.roomNo;
        if (roomEntity.roomNo == '-Room Name-') {
            ipRoom.bedsToBeDisplayed = [];
            ipRoom.bedNumNameInModal = '-Bed Number-';
            ipRoom.bedsToBeDisplayed.unshift(bedObject);
        } else {
            ipRoom.bedsToBeDisplayed = [];
            var localBedsOfARoom = [];
            localBedsOfARoom = _.filter(bedsFromApi, function(entity) {
                return (entity.organizationRoomId == roomEntity.id) && (entity.bedStatus == 'VACANT');
            });
            activeRoomNumber = roomEntity.roomNo;
            activeFloorNumber = roomEntity.floorNo;
            angular.copy(localBedsOfARoom, ipRoom.bedsToBeDisplayed);
            ipRoom.bedsToBeDisplayed.unshift(bedObject);
            ipRoom.bedNumNameInModal = '-Bed Number-';
        }
    }

    function selectedBedNameInModal(bedEntity) {
        nextBedId = bedEntity.id;
        nextBedNumber = bedEntity.bedNo;
        ipRoom.bedNumNameInModal = bedEntity.bedNo;
    }

    function timeChangeInTxtBox() {
        $scope.$watch('ipRoom.mytime', function() {
            ipRoom.transferPatient.transferTime = moment(ipRoom.mytime).format("hh:mm A");
        });
    }

    function roomTransferOfPatient() {
        if (!_.isEmpty(activeInpatient)) {
            var roomTransferDate = ipRoom.transferPatient.transferDate;
            var roomCategoryInModal = ipRoom.roomCategoryNameInModal;
            var roomNameInModal = ipRoom.roomNumNameInModal;
            var bedNameInModal = ipRoom.bedNumNameInModal;
            if (roomTransferDate !== undefined && roomTransferDate !== '' && roomCategoryInModal !== undefined && roomCategoryInModal !== '' && roomNameInModal !== undefined && roomNameInModal !== '' && bedNameInModal !== undefined && bedNameInModal !== '') {
                var roomTransferRequestEntity = {};
                roomTransferRequestEntity.patientId = activeInpatient.id;
                var localReason = {};
                localReason.type = 'ROOM_TRANSFERRED';
                localReason.roomCategoryName = activeRoomCategoryName;
                localReason.bedNumber = nextBedNumber;
                localReason.roomNumber = activeRoomNumber;
                localReason.floorNumber = activeFloorNumber;
                localReason.reason = ipRoom.transferPatient.reason;
                roomTransferRequestEntity.reason = JSON.stringify(localReason);
                if (ipRoom.transferPatient.nextChange !== undefined && ipRoom.transferPatient.nextChange !== '') {
                    roomTransferRequestEntity.nextChange = dboticaServices.getLongValueOfDate(ipRoom.transferPatient.nextChange);
                } else {
                    roomTransferRequestEntity.nextChange = '';
                }
                roomTransferRequestEntity.newBedId = nextBedId;
                $log.log('room transfer req entity is----', roomTransferRequestEntity);
                var transferPatientPromise = dboticaServices.transferPatientToAnotherRoom(roomTransferRequestEntity);
                $log.log('transfer patient promise is---', transferPatientPromise);
                transferPatientPromise.then(function(transferPatientResponse) {
                    var errorCode = transferPatientResponse.data.errorCode;
                    if (errorCode) {
                        dboticaServices.logoutFromThePage(errorCode);
                    } else {
                        transferPatientSuccess = angular.fromJson(transferPatientResponse.data.response);
                        $log.log('transfer patient success is---', transferPatientSuccess);
                        transferPatientSuccess.referenceDetails = angular.fromJson(transferPatientSuccess.details);
                        ipRoom.transfersListToBeDisplayed.push(transferPatientSuccess);
                        doctorServices.roomTransferSuccessSwal();
                        angular.element('#ipRoomTransferModal').modal('hide');
                        /*----TODO----*/
                        /*-----MAIN PROBLEM IS IN THE ABOVE FOUR LINES.PLEASE CHECK COMPLETE DELETE PART ALSO-----*/
                    }
                }, function(transferPatientError) {
                    dboticaServices.noConnectivityError();
                });
            } else {
                /*if (roomTransferDate == undefined || roomTransferDate == '') {
                    ipRoom.dateToolTip = true;
                    $timeout(function() {
                        ipRoom.dateToolTip = false;
                    }, 400);
                }*/
                if (roomCategoryInModal == '-Room Type-') {
                    ipRoom.roomCategoryToolTip = true;
                    $timeout(function() {
                        ipRoom.roomCategoryToolTip = false;
                    }, 400);
                }
                if (roomNameInModal == '-Room Name-') {
                    ipRoom.roomNumberToolTip = true;
                    $timeout(function() {
                        ipRoom.roomNumberToolTip = false;
                    }, 400);
                }
                if (bedNameInModal == '-Bed Number-') {
                    ipRoom.bedNumberToolTip = true;
                    $timeout(function() {
                        ipRoom.bedNumberToolTip = false;
                    }, 400);
                }
            }
        } else {
            angular.element('#ipRoomTransferModal').modal('hide');
            dboticaServices.inpatientErrorSwal();
        }
    }
};
