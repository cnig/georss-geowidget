var MashupPlatform = new MockMP.MockMP();

describe( "GeoRSS", function () {  
    
    var changeServiceCall;
    var args;
    var ajaxCall;
    var options;
    var successHandler;
    
    beforeEach(function () {
        changeServiceCall = MashupPlatform.wiring.registerCallback;
        args = inputCall.mostRecentCall.args;
        ajaxCall = MashupPlatform.http.makeRequest;
        options = ajaxCall.mostRecentCall.args[1];
        successHandler = spyOn(options, "onSuccess");
        successHandler.andCallThrough();
    });

    afterEach(function () {
    });

    describe("Initial state:", function () {
        it("para que aparezca", function(){
           expect(1).toEqual(1); 
        });
    });
    
    describe("Inputs:", function () {
        
        it("add new GeoRSS service.", function () {
            expect(2).toEqual(1); 
        });
        
    });

    describe("Outputs:", function () {
    });

    describe("Preferences:", function () {
    });

    describe("User Actions:", function () {
    });  
    
}); 