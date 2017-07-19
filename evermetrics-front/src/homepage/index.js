var page = require('page');
var empty = require('empty-element');
var template = require('./template');
var title = require('title');
var request = require('superagent');
var header = require('../header');
var utils = require('../utils');
var axios = require('axios');
var vistadato = require('../picture-card');
var io = require('socket.io-client');

var socket = io.connect('http://ws.evermetric.co');

page('/', utils.loadAuth, header, loadestadisticas, function(ctx, next){
  title('Evermetrics');
  var main = document.getElementById('main-container');

  empty(main).appendChild(template(ctx, ctx.dates));
  next();
}, function(next){
  (function ($) {
  	$.fn.countTo = function (options) {
  		options = options || {};

  		return $(this).each(function () {
  			// set options for current element
  			var settings = $.extend({}, $.fn.countTo.defaults, {
  				from:            $(this).data('from'),
  				to:              $(this).data('to'),
  				speed:           $(this).data('speed'),
  				refreshInterval: $(this).data('refresh-interval'),
  				decimals:        $(this).data('decimals')
  			}, options);

  			// how many times to update the value, and how much to increment the value on each update
  			var loops = Math.ceil(settings.speed / settings.refreshInterval),
  				increment = (settings.to - settings.from) / loops;

  			// references & variables that will change with each update
  			var self = this,
  				$self = $(this),
  				loopCount = 0,
  				value = settings.from,
  				data = $self.data('countTo') || {};

  			$self.data('countTo', data);

  			// if an existing interval can be found, clear it first
  			if (data.interval) {
  				clearInterval(data.interval);
  			}
  			data.interval = setInterval(updateTimer, settings.refreshInterval);

  			// initialize the element with the starting value
  			render(value);

  			function updateTimer() {
  				value += increment;
  				loopCount++;

  				render(value);

  				if (typeof(settings.onUpdate) == 'function') {
  					settings.onUpdate.call(self, value);
  				}

  				if (loopCount >= loops) {
  					// remove the interval
  					$self.removeData('countTo');
  					clearInterval(data.interval);
  					value = settings.to;

  					if (typeof(settings.onComplete) == 'function') {
  						settings.onComplete.call(self, value);
  					}
  				}
  			}

  			function render(value) {
  				var formattedValue = settings.formatter.call(self, value, settings);
  				$self.html(formattedValue);
  			}
  		});
  	};

  	$.fn.countTo.defaults = {
  		from: 0,               // the number the element should start at
  		to: 0,                 // the number the element should end at
  		speed: 1000,           // how long it should take to count between the target numbers
  		refreshInterval: 100,  // how often the element should be updated
  		decimals: 0,           // the number of decimal places to show
  		formatter: formatter,  // handler for formatting the value before rendering
  		onUpdate: null,        // callback method for every time the element is updated
  		onComplete: null       // callback method for when the element finishes updating
  	};

  	function formatter(value, settings) {
  		return value.toFixed(settings.decimals);
  	}

    $(document).ready(function() {

      //tabs de las redes
  		$(".tabs-menu-redes a").click(function(event) {
  			event.preventDefault();
  			$(this).parent().addClass("current");
  			$(this).parent().siblings().removeClass("current");
  			var tab = $(this).attr("href");
  			$(".tab-content-redes").not(tab).css("display", "none");
        $(".tab-content-redesm").not(tab).css("display", "none");
  			$(tab).fadeIn();
        $(".tab-content-datos").not(tab).css("display", "none");
        $('.estadisticas:first-child .tab-content-datos').fadeIn();
        $('.ano:first-child .tab-content-datos').fadeIn();
        $('.btnano').text(" ");
  		});
        // tabs meses
        $(".liMes a").click(function(event) {
  				event.preventDefault();
  				$(".liYear .liMes").removeClass("current");
  				//$(".liYear.active").removeClass("active");
  				$(this).parent().siblings().removeClass("current");
  				$(this).parent().addClass("current");
  				var tab = $(this).attr("href");
  				$(".tab-content-datos").not(tab).css("display", "none");
  				$(tab).fadeIn();
  			});
        // tabs tortas
        $(".linktorta").click(function(event) {
  				event.preventDefault();
  				//$(".liYear.active").removeClass("active");
  				$(this).parent().siblings().removeClass("current");
  				$(this).parent().addClass("current");
  				var tab = $(this).attr("href");
  				$(".tab-content-torta").not(tab).css("display", "none");
  				$(tab).fadeIn();
  			});
        // tabs grafica analytics
        $(".linkgraph").click(function(event) {
          event.preventDefault();
          //$(".liYear.active").removeClass("active");
          $(this).parent().siblings().removeClass("current");
          $(this).parent().addClass("current");
          var tab = $(this).attr("href");
          $(".tab-content-grafica").not(tab).css("display", "none");
          $(tab).fadeIn();
        });
        //tabs años
        $(".liYear a").click(function(event){
    			event.preventDefault();
          $(this).parent().addClass("current");
    			$(this).parent().siblings().removeClass("current");
    			//var tab = $(this).find('a').attr("href");
          var tab = $(this).attr("href");
          console.log(tab);
    			$(".tab-content-datos").not(tab).css("display", "none");
          $(".tab-content-datosm").not(tab).css("display", "none");
          if ( $('#stadistitics-container '+tab).length > 0 ) {
            $(tab).fadeIn();
            var sus = tab.substring(3,20);
            $('.btnano').text(sus + "  -");
          }else{
            $(tab).fadeIn();
            $('.default').fadeIn();
            var sus = tab.substring(3,20);
            $('.anoposi').text(sus);
            $('.btnano').text(sus + "  -");
          }
    		})
  		});


  	  $(document).ready(function(){
        $('ul.tabs').tabs();
        $('.tabs-menu-redes .mnli:first-child').addClass('current');
        $('#stadistitics-container .tab-content-redes:first-child').css('display', 'block');
        $('.contMenuNav .tab-content-redesm:first-child').css('display', 'block');
        if ( !$('#stadistitics-container .tab-content-redes').length > 0 ) {
          $('.contNewUser').fadeIn();
        }
      });

      $(document).ready(function(){
        $('.collapsible').collapsible();
      });

      $('#hideshow').on('click', function(event) {
        $('#year').toggle();
      });

      $(".rotate").click(function(){
        $(this).toggleClass("down");
      });

      $('.dropdown-button').dropdown({
        inDuration: 300,
        outDuration: 225,
        constrainWidth: false, // Does not change width of dropdown to that of the activator
        hover: false, // Activate on hover
        gutter: 0, // Spacing from edge
        belowOrigin: false, // Displays dropdown below the button
        alignment: 'left', // Displays dropdown with edge aligned to the left of button
        stopPropagation: false // Stops event propagation
      });

  }(jQuery));

  jQuery(function ($) {
    // custom formatting example
    $('#count-number').data('countToOptions', {
  	formatter: function (value, options) {
  	  return value.toFixed(options.decimals).replace(/\B(?=(?:\d{3})+(?!\d))/g, ',');
  	}
    });

    // start all the timers
    $('.timer').each(count);

    function count(options) {
  	var $this = $(this);
  	options = $.extend({}, options || {}, $this.data('countToOptions') || {});
  	$this.countTo(options);
    }

  });
})
/*
  function loadestadisticas(ctx, next){
   request
    .get('/api/estadisticas')
    .end(function(err,res){
      if(err) return console.log(err);
      ctx.datos = res.body;
      next();
    })
  }*/
/*
  socket.on('dates', function(dates){
    var stadistiticsEl = document.getElementById('stadistitics-container');
    var first = stadistiticsEl.firstChild;
    var date = vistadato(dates);
    stadistiticsEl.insertBefore(date, first);
  })*/

  function loadestadisticas(ctx, next){
       axios
        .get('/api/estadisticas')
        .then(function(res){
          ctx.dates = res.data;
          next();
        })
        .catch(function(err){
          console.log(err);
        })
  }

    async function asyncload(ctx, next){
          try {
            ctx.estadisticas = await fetch('/api/estadisticas').then( res => res.json() )
            next();
          } catch (err) {
            return console.log(err);
          }
      }
