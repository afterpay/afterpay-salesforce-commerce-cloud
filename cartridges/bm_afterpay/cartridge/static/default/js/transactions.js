'use strict';

var j = jQuery.noConflict();

var trans = {
	init: function(){
		if(j('.afterpay-module .operations-holder').length){
			this.transOperationsEvents();
		}
	},
	transOperationsEvents: function(){
		j('.operations-holder button').on('click', function(){
			var button = j(this),
				buttonLabel = button.text(),
				action = "refund",
				orderno = j('input[name=orderno]').val(),
				amount = j('input[name=amount]').val(),
				url, postData;
			
			j('.operations-holder .error').text("");
			url = Urls.operationActions;
			postData = {
				action: action,
				orderno: orderno,
				amount: amount,
			};
			
			button.prop("disabled", true);
			button.text(Resources.TRANSACTION_PROCESSING);
			
			j.post(url, postData, function(data,status){
				var result = data ? JSON.parse(data) : {};
				console.log(result);
				
				button.prop("disabled", false);
				button.text(buttonLabel);
				
				if(result && result.status){
					alert(Resources.TRANSACTION_SUCCESS);
					window.location.reload();
				}
				else{
					alert(Resources.TRANSACTION_FAILED + result.error);
				}
			});
		});
	}
};

//initialize app
j(document).ready(function () {
    trans.init();
});
