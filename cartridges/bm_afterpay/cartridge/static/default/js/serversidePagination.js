(function($){	
		var dTable = $("#filtertableProjects").DataTable({
			"lengthMenu": [[10, 25, 50, 100, 500, 1000, -1], [10, 25, 50, 100, 500, 1000, "All"]],
			"processing": true,
	        "serverSide": true,
	        "iDisplayLength": 10,
	        "destroy": true,
	        "ajax": 
	        {
	        	url:"/on/demandware.store/Sites-Site/default/AfterPay-OrderList",
	        	contentType: "application/json; charset=utf-8",
                dataType: "json",
                data: "",
                success: function (results) {
                    //toastr["success"]("AJAX call succeeded.", "Success:");
                    var objJSON = $.parseJSON(results.d);
                    $(objJSON.data).each(function () {
                        alert(this.Age);
                    });
                },
                error: function(e) {
                    alert(e.responseText);
                	//toastr["error"]("There has been a problem retrieving the information from the database. " + e.responseText, "Error:");
                },
                complete: function () {
                    $('#orderlist').show();
                }
	        },
	        "aoColumns": [
	                    { "sTitle": "OrderID","orderable":true,"searchable":true},
	                    { "sTitle": "TransactionID","orderable":false,"searchable":false },
	                    { "sTitle": "Order Date","orderable":false,"searchable":false },
	                    { "sTitle": "Email","orderable":false,"searchable":false },
	                    { "sTitle": "Total","orderable":false,"searchable":false },
	                    { "sTitle": "Transaction Type" ,"orderable":false,"searchable":false},
	                    { "sTitle": "Transaction Status","orderable":false,"searchable":false }
	                ]
            //console.log(aoColumns);	
		});
})(jQuery);
