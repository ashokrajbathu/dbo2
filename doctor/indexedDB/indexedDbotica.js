var COMPAT_ENVS = [
    ['Firefox', ">= 16.0"],
    ['Google Chrome',
        ">= 24.0 (you may need to get Google Chrome Canary), NO Blob storage support"
    ]
];
var compat = $('#compat');
compat.empty();
compat.append('<ul id="compat-list"></ul>');
COMPAT_ENVS.forEach(function(val, idx, array) {
    $('#compat-list').append('<li>' + val[0] + ': ' + val[1] + '</li>');
});

const DB_NAME = 'dbotica-indexedDB';
const DB_VERSION = 2; // Use a long long for this value (don't use a float)
const DB_DRUG_STORE = 'drugs';
const DB_PATIENT_STORE = 'patients';
const DB_PRESCRIPTION_STORE = 'prescriptions';
const DB_SYNC_STORE = 'syncStore';

/*var doctorObject = localStorage.getItem('currentDoctor');
doctorObject = $.parseJSON(doctorObject);*/
/*console.log('doctor ob---', doctorObject.id);*/
/*const doctorId = doctorObject.id;*/

var db;

// Used to keep track of which view is displayed to avoid uselessly reloading it
var current_view_pub_key;
window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
if (!window.indexedDB) {

}


function openDb(callBack) {
    var req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onsuccess = function(event) {
        // Better use "this" than "req" to get the result to avoid problems with
        // garbage collection.
        // db = req.result;
        db = event.target.result;
        syncAllDrugsToIndexedDB();
        syncAllPrescriptionsToIndexedDB();
        console.log("opendDb Success");
        if (!!callBack) {
            callBack();
        }
    };
    req.onerror = function(event) {
        console.error("openDb:", event.target.errorCode);
    };

    req.onupgradeneeded = function(event) {
        db = event.target.result;
        event.target.transaction.oncomplete = function(e) {

            limitDrugIndex = 1000;
            totalDrugCount = 0;
            //syncAllDrugstoIndexedDB();


            limitPrescriptionIndex = 100;
            totalPrescriptionCount = 0;

            //syncAllPrescriptionsToIndexedDB();
        };
        event.target.transaction.onerror = indexedDB.onerror;

        event.target.transaction.onabort = function(e) {

        };
        if (!db.objectStoreNames.contains(DB_DRUG_STORE)) {
            var drugStore = db.createObjectStore(DB_DRUG_STORE, { keyPath: "id" });
            drugStore.createIndex('brandName', 'brandName', { unique: false });
        }
        if (!db.objectStoreNames.contains(DB_PATIENT_STORE)) {
            var patientStore = db.createObjectStore(DB_PATIENT_STORE, { keyPath: "id" });
            patientStore.createIndex('phoneNumber', 'phoneNumber', { unique: false });
        }
        if (!db.objectStoreNames.contains(DB_PRESCRIPTION_STORE)) {
            var prescriptionStore = db.createObjectStore(DB_PRESCRIPTION_STORE, { keyPath: "id" });
            prescriptionStore.createIndex('creationTime', 'creationTime', { unique: true });
            prescriptionStore.createIndex('patientPhoneNumber-creationTime', ['patientPhoneNumber', 'creationTime'], { unique: false });

        }
        if (!db.objectStoreNames.contains(DB_SYNC_STORE)) {
            var syncStore = db.createObjectStore(DB_SYNC_STORE, { keyPath: "store" });
        }


    };
}

/*
 * Generic functions for objectstores
 *
 *
 */
function getObjectStore(store_name, mode) {
    var tx = db.transaction(store_name, mode);
    return tx.objectStore(store_name);
}

function clearObjectStore(store_name) {

    var store = getObjectStore(store_name, 'readwrite');
    var req = store.clear();
    req.onsuccess = function(evt) {
        //displayActionSuccess("Store cleared");
        //displayPubList(store);
    };
    req.onerror = function(evt) {
        console.error("clearObjectStore:", evt.target.errorCode);
        //displayActionFailure(this.error);
    };
}
/*
Functions for getting all objects of different objectStores from server
*/

/**
 * sync all drugs in a loop from server.
 * 
 */

var limitDrugIndex;
var totalDrugCount;


function syncAllDrugsToIndexedDB() {
    var syncStore = getObjectStore(DB_SYNC_STORE, 'readonly');
    var startDrugIndex = 0;
    var lastUpdatedDrugIndex = 0;
    var request = syncStore.get(DB_DRUG_STORE);
    request.onsuccess = function(event) {
        var obj = request.result;
        /*console.log("syncstore result ",obj);*/
        if (obj && obj != null) {
            if (obj.store == DB_DRUG_STORE) {

                startDrugIndex = obj["start"];
                lastUpdatedDrugIndex = (obj["lastUpdated"] && obj["lastUpdated"] != null) ? obj["lastUpdated"] : 0;

            }

        }

        $.ajax({
            type: "GET",
            url: "http://localhost:8080/dbotica-spring/drug/getDrugs",
            beforeSend: function(xhr) {
                xhr.setRequestHeader("Content-Type", "application/json");
                xhr.setRequestHeader("Accept", "application/json");
            },
            data: {
                'start': startDrugIndex,
                'limit': 1000,
                'lastUpdated': lastUpdatedDrugIndex
            },
            xhrFields: {
                withCredentials: true
            },
            success: function(response) {
                var data = angular.fromJson(response.response);
                //console.log("In sync drugs: " + response.totalCount + " " + data.length);
                var drugObjectStore = getObjectStore(DB_DRUG_STORE, "readwrite");
                totalDrugCount = response.totalCount;

                for (var i = 0, l = data.length; i < l; i++) {
                    var drugObject = data[i];
                    drugObject['brandName'] = drugObject['brandName'].toLowerCase();
                    //console.log(drugObject);
                    drugObjectStore.put(drugObject);
                }
                startDrugIndex = startDrugIndex + data.length;
                var syncStore = getObjectStore(DB_SYNC_STORE, 'readwrite');
                var request1 = syncStore.get(DB_DRUG_STORE);
                request1.onsuccess = function(event) {


                    if (startDrugIndex < totalDrugCount) {
                        var obj1 = {};
                        obj1["store"] = DB_DRUG_STORE;
                        obj1["start"] = startDrugIndex;
                        obj1["lastUpdated"] = lastUpdatedDrugIndex;
                        var req = syncStore.put(obj1);
                        req.onsuccess = function(event) {
                            syncAllDrugsToIndexedDB();
                        }
                        req.onerror = function() {
                            console.error("syncAllDrugstoIndexedDB second req ", this.error);
                        }

                    } else {
                        var obj = {};
                        obj["store"] = DB_DRUG_STORE;
                        obj["start"] = 0;
                        obj["lastUpdated"] = (new Date).getTime();
                        var req1 = syncStore.put(obj);
                        req1.onsuccess = function(event) {}
                        req1.onerror = function() {
                            console.error("syncAllDrugstoIndexedDB third error ", this.error);
                        }
                    }



                }


            }
        });



    }
    request.onerror = function() {
        console.error("syncAllDrugstoIndexedDB first request ", this.error);
    }


}



/*
 *  Get all prescriptions issued by this doctor
 */

var limitPrescriptionIndex;
var totalPrescriptionCount;

function syncAllPrescriptionsToIndexedDB() {
    var syncStore = getObjectStore(DB_SYNC_STORE, 'readonly');
    var startPrescriptionIndex = 0;
    var lastUpdatedPrescriptionIndex = 0;
    var request = syncStore.get(DB_PRESCRIPTION_STORE);
    request.onsuccess = function(event) {
        var obj = request.result;
        if (obj && obj != null) {
            if (obj.store == DB_PRESCRIPTION_STORE) {
                startPrescriptionIndex = obj["start"];
                lastUpdatedPrescriptionIndex = (obj["lastUpdated"] && obj["lastUpdated"] != null) ? obj["lastUpdated"] : 0;

            }

        }

        $.ajax({
            type: "GET",
            url: "http://localhost:8080/dbotica-spring/doctor/myPrescriptions",
            beforeSend: function(xhr) {
                xhr.setRequestHeader("Content-Type", "application/json");
                xhr.setRequestHeader("Accept", "application/json");
            },
            data: {
                'start': startPrescriptionIndex,
                'limit': 100
            },
            xhrFields: {
                withCredentials: true
            },
            success: function(response) {
                var data = {};
                data = $.parseJSON(response.response);
                // console.log('data in indexed db is----', data);
                var patientObjectStore = getObjectStore(DB_PATIENT_STORE, "readwrite");
                totalPrescriptionCount = response.totalCount;

                for (var i = 0, l = data.length; i < l; i++) {
                    if (data[i]["patientInfo"] !== undefined) {
                        patientObjectStore.put(data[i]["patientInfo"]);

                    } else {
                        data[i]['patientInfo'] = {};
                    }
                    var doctorObject = localStorage.getItem('currentDoctor');
                    doctorObject = $.parseJSON(doctorObject);
                    var doctorId = doctorObject.id;
                    addPrescriptionToIndexedDB(data[i]["prescription"], data[i]["patientInfo"], doctorId);

                }
                startPrescriptionIndex = startPrescriptionIndex + data.length;
                var syncStore = getObjectStore(DB_SYNC_STORE, 'readwrite');
                var request1 = syncStore.get(DB_PRESCRIPTION_STORE);
                request1.onsuccess = function(event) {


                    if (startPrescriptionIndex < totalPrescriptionCount) {
                        var obj1 = {};
                        obj1["store"] = DB_PRESCRIPTION_STORE;
                        obj1["start"] = startPrescriptionIndex;
                        obj1["lastUpdated"] = lastUpdatedPrescriptionIndex;
                        var req = syncStore.put(obj1);
                        req.onsuccess = function(event) {
                            syncAllPrescriptionsToIndexedDB()
                        }
                        req.onerror = function() {
                            console.error("SyncAllPrescriptiontoIndexedDB second req ", this.error);
                        }
                    } else {
                        var obj = {};
                        obj["store"] = DB_PRESCRIPTION_STORE;
                        obj["start"] = 0;
                        obj["lastUpdated"] = (new Date).getTime();
                        var req1 = syncStore.put(obj);
                        req1.onsuccess = function(event) {}
                        req1.onerror = function() {
                            console.error("SyncAllPrescriptiontoIndexedDB third error ", this.error);
                        }
                    }


                }
            }

        });
    }
}



/*
Get all patiensts of this doctor from server
*/
//TODO
/*function syncAllPatientsToIndexedDB() {

    $.ajax({
        type: "GET",
        url: "http://localhost:8080/dbotica-spring/doctor/myPatients",
        success: function(response) {
            var data = $.parseJSON(response.response);
            //console.log
            (data);
            var patientObjectStore = getObjectStore(DB_PATIENT_STORE, "readwrite");
            for (var i = 0, l = data.length; i < l; i++) {
                patientObjectStore.put(data[i]);
            }
        }
    });

}*/

/*
 *
 * Store a object in respective object store
 *
 *
 */

/*
 *  Adding prescription
 */


/*
    Prescription prescription;
    Patient patientInfo;
    Doctor doctorInfo;
  */

function addPrescriptionToIndexedDB(prescription, patientInfo, doctorId, callBack) {
    /*console.log("addPrescription argumensts:", arguments);*/
    var patientName = !$.isEmptyObject(patientInfo) ? patientInfo.firstName : "Unknown";
    var patientPhoneNumber = !$.isEmptyObject(patientInfo) ? patientInfo.phoneNumber : 0;
    // console.log('prescription is-----', prescription);
    //console.log('patient info is----', patientInfo);
    //console.log('doctor id is----', doctorId);
    var obj = { "id": prescription.id, "prescription": prescription, "patientInfo": patientInfo, "doctorId": doctorId, "patientName": patientName, "patientPhoneNumber": patientPhoneNumber, "creationTime": new Date(prescription.creationTime) };
    var store = getObjectStore(DB_PRESCRIPTION_STORE, 'readwrite');

    /*console.log("prescription obj", obj);*/
    var request = store.get(prescription.id);


    //console.log("came here");
    request.onsuccess = function(event) {
        var prescriptionObj = event.target.result;
        var a = !prescriptionObj;
        var b = a || $.isEmptyObject(prescriptionObj.patientInfo);
        var c = a || prescriptionObj.patientInfo === undefined;
        var d = !$.isEmptyObject(obj.patientInfo);

        if (!prescriptionObj || $.isEmptyObject(prescriptionObj.patientInfo) || prescriptionObj.patientInfo === undefined || !$.isEmptyObject(obj.patientInfo)) {
            var prescriptionStore = getObjectStore(DB_PRESCRIPTION_STORE, 'readwrite');
            // console.log('obj is before adding-----', obj);
            var requestUpdate = prescriptionStore.put(obj);
            requestUpdate.onsuccess = function(event) {

                if (!!callBack)
                    callBack();

            }
        }

    }


}

/**
   * Adding a patient to indexedDB
   * String firstName;
     String emailId;
     Boolean isEmailVerified;
     String phoneNumber;
     String password;
     Boolean isPhoneVerified;
     String userName;
     Integer age;
     String city;
     String id;
     String gender;
     String bloodGroup;
   * 
   * 
   * 
   */
/*function addPatienttoIndexedDB(id, firstName, emailId, isEmailVerified, phoneNumber, isPhoneVerified, userName, age, city, gender, bloodGroup) {
    console.log("addPatient aruguments:", arguments);
    var obj = { "id": id, "firstName": firstName, "emailId": emailId, "isEmailVerified": isEmailVerified, "phoneNumber": phoneNumber, "isPhoneVerified": isPhoneVerified, "userName": userName, "age": age, "city": city, "gender": gender, "bloodGroup": bloodGroup };
    var store = getObjectStore(DB_PATIENT_STORE, 'readwrite');

    var req = store.add(obj);
    req.onsuccess = function(event) {
        console.log("Add Patient successfull");

    }
    req.onerror = function() {
        console.error("addPatient error", this.error);

    }

}*/

function addPatientObjecttoIndexedDB(obj) {

    var store = getObjectStore(DB_PATIENT_STORE, 'readwrite');
    var request = store.get(obj.id);
    request.onsuccess = function(event) {
        var patient = request.result;

        var requestUpdate = store.put(obj);
        requestUpdate.onsuccess = function(event) {

            showAllPatients();

        }
        requestUpdate.onerror = function() {
            console.error("addPatientObjecttoIndexedDB", this.error);
        }
    }

}

function updatePatientObjectIndexedDB(obj) {

    var store = getObjectStore(DB_PATIENT_STORE, 'readwrite');
    var index = store.index("phoneNumber");
    index.openCursor(obj.phoneNumber).onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
            var data = cursor.value;
            data['gender'] = obj['gender'];
            data['firstName'] = obj['firstName'];
            data['emailId'] = obj['emailId'];
            //data['phoneNumber']   =   obj['phoneNumber'];
            data['age'] = obj['age'];
            data['bloodGroup'] = obj['bloodGroup'];
            var requestUpdate = store.put(data);
            requestUpdate.onsuccess = function(event) {

                showAllPatients();
            }
            requestUpdate.onerror = function() {
                console.error("updatePatientObjectIndexedDB ", this.error);
            }
        }

    }
}

/*
 * Get objects from object store when offline or any other time
 *
 */

/*
Get Patient from object store from phone number
*/

function getPatientByPhoneNumberFromIndexedDB(phoneNumber) {
    var store = getObjectStore(DB_PATIENT_STORE, 'readonly');
    var index = store.index("phoneNumber");
    index.get(phoneNumber).onsuccess = function(event) {
        return event.target.result;
    };
}



/*
 * get all prescriptions of this doctor from indexedDB
 *
 */

function getAllPrescriptionsFromIndexedDB(addDataToTable, callBackAfterAdding, id) {
    var result = [];

    var store = getObjectStore(DB_PRESCRIPTION_STORE, 'readonly');
    var index = store.index("creationTime");

    index.openCursor(null, "prev").onsuccess = function(event) {
        var cursor = event.target.result;
        //console.log("cursor value is----", cursor);
        if (cursor) {
            var doctorObject = localStorage.getItem('currentDoctor');
            doctorObject = $.parseJSON(doctorObject);
            var doctorId = doctorObject.id;
            if (cursor.value.doctorId == doctorId) {
                result.push(cursor.value);
                console.log("cursor value object is---", cursor.value);
                //console.log("cursor value array is---" + cursor.value);
                addDataToTable(cursor.value);
            }

            cursor.continue();
        } else {
            callBackAfterAdding(id);


        }
        //console.log("objects are----", result); //addDataToTable(result);
    };
}

/*function getPrescriptionsByPatientNameFromIndexedDB(patientName, addDataToTable) {
    var result = [];

    var store = getObjectStore(DB_PRESCRIPTION_STORE, 'readonly');
    var index = store.index("patientName");
    var range = IDBKeyRange.bound(patientName.toLowerCase(), patientName.toLowerCase() + "z", false, true);

    index.openCursor(range).onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
            if (cursor.value.doctorId == doctorId) {
                result.push(cursor.value);
                addDataToTable(cursor.value);

            }

            cursor.continue();
        }
    };
}*/

function getPrescriptionsById(prescriptionId, addDataToTable, callBackAfterAdding, id) {
    var result = [];
    var store = getObjectStore(DB_PRESCRIPTION_STORE, 'readonly');
    var request = store.get(prescriptionId);
    request.onsuccess = function(event) {
        addDataToTable(event.target.result);
        callBackAfterAdding(id)
    }


}

function getPrescriptionsByTimeFromIndexedDB(fromDate, toDate, addDataToTable, callBackAfterAdding, id) {
    var result = [];
    var store = getObjectStore(DB_PRESCRIPTION_STORE, 'readonly');
    var index = store.index("creationTime");
    var range;
    if (fromDate != "" && toDate != "") {
        range = IDBKeyRange.bound(fromDate, toDate);
        console.log('range value is----', range);
    } else if (fromDate == "") {
        range = IDBKeyRange.upperBound(toDate);
    } else {
        range = IDBKeyRange.lowerBound(fromDate);
    }
    index.openCursor(range, "prev").onsuccess = function(event) {
        console.log('event is----', event);
        var cursor = event.target.result;
        console.log('cursor value is---', cursor);
        if (cursor) {
            var doctorObject = localStorage.getItem('currentDoctor');
            doctorObject = $.parseJSON(doctorObject);
            var doctorId = doctorObject.id;
            if (cursor.value.doctorId == doctorId) {
                result.push(cursor.value);
                addDataToTable(cursor.value);
            }
            cursor.continue();
        } else {
            if (!!callBackAfterAdding) {
                callBackAfterAdding(id);
            }
        }
    };
}

function searchPrescriptionsByTimeFromIndexedDB(fromDate, toDate, addDataToTable, sortPrescriptions) {
    var result = [];
    var store = getObjectStore(DB_PRESCRIPTION_STORE, 'readonly');
    var index = store.index("creationTime");
    var range;
    if (fromDate !== undefined && fromDate != "" && toDate !== undefined && toDate != "") {
        console.log('from dt is---', fromDate);
        console.log('to date is----', toDate);
        range = IDBKeyRange.bound(fromDate, toDate);
        console.log('range value is----', range);
    } else if (fromDate !== undefined && fromDate == "") {
        range = IDBKeyRange.upperBound(toDate);
    } else {
        range = IDBKeyRange.lowerBound(fromDate);
    }
    index.openCursor(range, "prev").onsuccess = function(event) {
        console.log('event is ----', event);
        var cursor = event.target.result;
        console.log('cursor value is---', cursor);
        if (cursor) {
            console.log('in cursor one check---');
            var doctorActive = localStorage.getItem('currentDoctor');
            doctorActive = angular.fromJson(doctorActive);
            if (cursor.value.doctorId == doctorActive.id) {
                result.push(cursor.value);
                console.log('in cursor check----');
                addDataToTable(cursor.value);

            }

            cursor.continue();
        } else {
            if (sortPrescriptions) {
                sortPrescriptions();
            }

        }
    };

}

function getPrescriptionsFromIndexedDB(fromDate, toDate, phoneNumber, prescriptionId, addDataToTable, callBackAfterAdding, id) {
    var result = [];
    var store = getObjectStore(DB_PRESCRIPTION_STORE, 'readonly');
    var index = store.index('patientPhoneNumber-creationTime');
    var range;
    var initDay = new Date("Fri Mar 25 2016 18:53:37 GMT+0530");
    var today = new Date();
    if (fromDate == "" && toDate == "" && phoneNumber == "" && prescriptionId == "") {

        getAllPrescriptionsFromIndexedDB(addDataToTable, callBackAfterAdding, id);
        return;
    }
    if (prescriptionId.trim() != "") {
        getPrescriptionsById(prescriptionId.trim(), addDataToTable, callBackAfterAdding, id)
        return;
    }
    if (fromDate != "")
        fromDate = new Date(fromDate);
    if (toDate != "")
        toDate = new Date(toDate);
    if (phoneNumber != "") {
        if (fromDate != "" && toDate != "") {
            range = IDBKeyRange.bound([phoneNumber, fromDate], [phoneNumber, toDate]);
        } else if (toDate != "") {
            range = IDBKeyRange.bound([phoneNumber, initDay], [phoneNumber, toDate]);
        } else if (fromDate != "") {
            range = IDBKeyRange.bound([phoneNumber, fromDate], [phoneNumber, today]);
        } else {
            range = IDBKeyRange.bound([phoneNumber, initDay], [phoneNumber, today]);
        }
    } else {
        getPrescriptionsByTimeFromIndexedDB(fromDate, toDate, addDataToTable, callBackAfterAdding, id);

        return;
    }
    index.openCursor(range, "prev").onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
            var doctorObject = localStorage.getItem('currentDoctor');
            doctorObject = $.parseJSON(doctorObject);
            var doctorId = doctorObject.id;
            if (cursor.value.doctorId == doctorId) {
                result.push(cursor.value);
                addDataToTable(cursor.value);

            }
            cursor.continue();
        } else {
            callBackAfterAdding(id);
        }
    };
}

function prescriptionSearchFromIndexedDB(fromDate, toDate, phoneNumber, addDataToTable, transferDataAfterSort) {
    var result = [];
    var store = getObjectStore(DB_PRESCRIPTION_STORE, 'readonly');
    var index = store.index('patientPhoneNumber-creationTime');
    var range;
    var initDay = new Date("Fri Mar 25 2016 18:53:37 GMT+0530");
    var today = new Date();
    if (fromDate == "" && toDate == "" && phoneNumber == "") {
        getAllPrescriptionsFromIndexedDBOnLoad(addDataToTable, transferDataAfterSort);
        return;
    }
    if (fromDate == undefined || fromDate == '') {
        fromDate = '';
    }
    if (toDate == undefined || toDate == '') {
        toDate = '';
    }
    if (fromDate !== undefined && fromDate != "")
        fromDate = new Date(fromDate);
    if (toDate !== undefined && toDate != "")
        toDate = new Date(toDate);
    if (phoneNumber !== undefined && phoneNumber != "") {
        if (fromDate !== undefined && fromDate != "" && toDate !== undefined && toDate != "") {
            range = IDBKeyRange.bound([phoneNumber, fromDate], [phoneNumber, toDate]);
        } else if (toDate != "") {
            range = IDBKeyRange.bound([phoneNumber, initDay], [phoneNumber, toDate]);
        } else if (fromDate != "") {
            range = IDBKeyRange.bound([phoneNumber, fromDate], [phoneNumber, today]);
        } else {
            range = IDBKeyRange.bound([phoneNumber, initDay], [phoneNumber, today]);
        }
    } else {
        searchPrescriptionsByTimeFromIndexedDB(fromDate, toDate, addDataToTable, transferDataAfterSort);

        return;
    }
    index.openCursor(range, "prev").onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
            var doctorActive = localStorage.getItem('currentDoctor');
            doctorActive = angular.fromJson(doctorActive);
            if (cursor.value.doctorId == doctorActive.id) {
                result.push(cursor.value);
                addDataToTable(cursor.value);

            }
            cursor.continue();
        } else {
            //if (!!callBackAfterAdding) {
            transferDataAfterSort();
            //}
        }
    };
}

function getAllPrescriptionsFromIndexedDBOnLoad(addDataToArray, transferArrayToDisplay) {
    var result = [];

    var store = getObjectStore(DB_PRESCRIPTION_STORE, 'readonly');
    var index = store.index("creationTime");

    index.openCursor(null, "prev").onsuccess = function(event) {
        var cursor = event.target.result;
        console.log("cursor value is----", cursor);
        if (cursor) {
            console.log('in first idf check----');
            var doctorActive = localStorage.getItem('currentDoctor');
            doctorActive = angular.fromJson(doctorActive);
            if (cursor.value.doctorId == doctorActive.id) {
                console.log('in if check----');
                result.push(cursor.value);
                addDataToArray(cursor.value);
            }
            cursor.continue();
        } else {
            transferArrayToDisplay();
        }
    };
}




/*
 * Autocomplete search from indexedDB
 */
function autocompleteDrugIndexedDB(searchterm, id, handleData, callback) {


    var result = [];
    var flag = 0;
    var count = 0;
    //console.log("Enterering autocompleteDrugIndexedDB");
    var store = getObjectStore(DB_DRUG_STORE, 'readonly');
    var range = IDBKeyRange.bound(searchterm.toLowerCase(), searchterm.toLowerCase() + '\uffff', false, true);
    var index = store.index("brandName");
    index.openCursor(range).onsuccess = function(event) {
        var cursor = event.target.result;
        //console.log(cursor);
        if (cursor && count < 10) {
            result.push(cursor.value);
            //console.log(cursor.value);
            count++;
            cursor.continue();
        } else {


            /*console.log("reult in index is-------", result);*/
            handleData(result, callback);
            //callback(result);


        }
    };

}

/*
  $('#prescription-form-drug').keyup(function(e){
  var brandName = $('#prescription-form-drug').val();
  if (brandName === "") {
    $('.drugs-dropdown-menu').hide('dropdown');
    return;
  }
  e.preventDefault();
  $('.drugs-dropdown-menu').hide('dropdown');
  $('.drugs-dropdown-menu').empty();
  
    
   autocompleteDrugIndexedDB(brandName,OnGetDrugsResponse);
  
});

*/




/*
 For debugging
*/

function showAllPatients() {
    var store = getObjectStore(DB_PATIENT_STORE, 'readonly');
    store.openCursor().onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
            /*console.log(cursor.value);*/
            cursor.continue();
        }
    }

}

function showAllPrescriptions() {
    var store = getObjectStore(DB_PRESCRIPTION_STORE, 'readonly');
    store.openCursor().onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {

            cursor.continue();
        }
    }

}

/*function prescriptionSearchFromIndexedDB(fromDate, toDate, phoneNumber, addDataToTable, transferDataAfterSort) {
    var result = [];
    var store = getObjectStore(DB_PRESCRIPTION_STORE, 'readonly');
    var index = store.index('patientPhoneNumber-creationTime');
    var range;
    var initDay = new Date("Fri Mar 25 2016 18:53:37 GMT+0530");
    var today = new Date();

    console.log('from date is----', fromDate);
    console.log('to date is----', toDate);

    if (fromDate == "" && toDate == "" && phoneNumber == "") {

        getAllPrescriptionsFromIndexedDBOnLoad(addDataToTable, transferDataAfterSort);
        return;
    }

    if (fromDate !== undefined && fromDate != "") {

        fromDate = new Date(fromDate);
        if (toDate == undefined || toDate == '') {
            toDate = initDay;
        }
        console.log('from date for sort in if is----', fromDate);
    } else {
        fromDate = initDay;
    }
    if (toDate !== undefined && toDate != "") {
        toDate = new Date(toDate);
        console.log('from date in if is----', toDate);
    } else {
        toDate = new Date();
        console.log('from date in else is----', toDate);
    }
    if (phoneNumber !== undefined && phoneNumber != "") {
        if (fromDate !== undefined && fromDate != "" && toDate !== undefined && toDate != "") {
            console.log('idb key value is---', IDBKeyRange);
            range = IDBKeyRange.bound([phoneNumber, fromDate], [phoneNumber, toDate]);
        } else if (toDate != "") {
            range = IDBKeyRange.bound([phoneNumber, initDay], [phoneNumber, toDate]);
        } else if (fromDate != "") {
            range = IDBKeyRange.bound([phoneNumber, fromDate], [phoneNumber, today]);
        } else {
            range = IDBKeyRange.bound([phoneNumber, initDay], [phoneNumber, today]);
        }
    } else {
        console.log('in search---');
        searchPrescriptionsByTimeFromIndexedDB(fromDate, toDate, addDataToTable, transferDataAfterSort);

        return;
    }
    index.openCursor(range, "prev").onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
            var doctorActive = localStorage.getItem('currentDoctor');
            doctorActive = angular.fromJson(doctorActive);
            if (cursor.value.doctorId == doctorActive.id) {
                result.push(cursor.value);
                addDataToTable(cursor.value);

            }
            cursor.continue();
        } else {
            transferDataAfterSort();
        }
    };
}
*/

/**
 * @param {string} biblioid
 */
function deletefromIndexedDb(biblioid) {
    var store = getObjectStore(DB_STORE_NAME, 'readwrite');
    var req = store.index('biblioid');
    req.get(biblioid).onsuccess = function(evt) {
        if (typeof evt.target.result == 'undefined') {
            displayActionFailure("No matching record found");
            return;
        }
        deletefromIndexedDb(evt.target.result.id, store);
    };
    req.onerror = function(evt) {
        console.error("deletePublicationFromBib:", evt.target.errorCode);
    };
}
