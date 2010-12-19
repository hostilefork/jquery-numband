// Interval
//
// Javascript class for representing an inclusive/exclusive range
// of values, as described by:
//
// http://zonalandeducation.com/mmts/miscellaneousMath/intervalNotation/intervalNotation.html
//

function IntervalBound(value, isInclusive) {
	if ((typeof value !== typeof 1) || isNaN(value)) {
		throw "Interval value must be a Number.";
	}
	// Consistent with mathematics, infinities are never inclusive.
	if (!isFinite(value) && isInclusive) {
		throw "infinite InterValBound cannot be inclusive";
	}
	
	this.value = value;
	this.isInclusive = isInclusive ? true : false;
	
	this.equals = function(other) {
		return (other.value == this.value) && (other.isInclusive == this.isInclusive);
	};
}

function Interval(lowerBound, upperBound) {
	if (!(lowerBound instanceof IntervalBound) || 
			!(upperBound instanceof IntervalBound)) {
		throw "Interval requires two IntervalBound instances";
	}
	
	if (lowerBound.value > upperBound.value) {
		throw "Interval must range from smaller to larger values";
	}
	
	if (lowerBound.value == upperBound.value) {
		throw "Interval cannot be a point"; // REVIEW: should it be able to?
	}
	
	this.lowerBound = lowerBound;
	this.upperBound = upperBound;
	
	this.containsValue = function(value) {
		if ((typeof value !== typeof 1) || isNaN(value) || !isFinite(value)) {
			throw "Interval.containsValue only works with real numbers.";
		}
		return (((value > this.lowerBound.value) || 
			(this.lowerBound.isInclusive && (value == this.lowerBound.value))) &&
			((value < this.upperBound.value) ||
			(this.upperBound.isInclusive && (value == this.upperBound.value))));
	};
	
	this.equals = function(other) {
		return this.lowerBound.equals(other.lowerBound) && this.upperBound.equals(other.upperBound);
	};
	
	this.toString = function() {
		var result = "";
		
		if (lowerBound.isInclusive) {
			result += "[ ";
		} else {
			result += "( ";
		}
	
		if (lowerBound.value == -Infinity) {
			result += lowerBound.value; // could use "-inf" but that wouldn't parseFloat
		} else {
			result += lowerBound.value;
		}
		
		result += " , ";

		if (upperBound.value == Infinity) {
			result += upperBound.value; // could use "+inf" but that wouldn't parseFloat
		} else {
			result += upperBound.value;
		}
				  
		if (upperBound.isInclusive) {
			result += " ]";
		} else {
			result += " )";
		}
		
		return result;
	};
}

// REVIEW: assumes strict format as produced by Interval.toString()
function parseInterval(str) {
	var tokens = str.split(" ");
	if (tokens.length != 5) {
		throw "parseInterval expected exactly 5 tokens";
	}
	return new Interval(
		new IntervalBound(parseFloat(tokens[1]), tokens[0] == "["),
		new IntervalBound(parseFloat(tokens[3]), tokens[4] == "]")
	);
}


//
// Numeric banding code
//

var Numband = {};

$(document).ready(function() {

	var upTriangleEntity = '&#9650;';
	var downTriangleEntity = '&#9660;';
	
	function ascendingNumericCompare(a, b) {
		return (a - b);
	}
	
	// Extract unique numbers from string and return an array.
	// Finds both floats and integers
	function extractUniqueNumbersFromString(str) {
		var numericChars = "1234567890.-";
		var result = [];
		var buffer = "";
		
		for (var index = 0; index < str.length; index++) {
			var isNumericChar = (numericChars.indexOf(str[index]) != -1);
			if (isNumericChar) {
				buffer = buffer + str[index];
			}
			if (!isNumericChar || (index == str.length - 1)) {
				var value = null;
				if (buffer.length) {
					value = parseFloat(buffer);
					if (!isNaN(value) && result.indexOf(value) == -1) {
						result.push(value);
					}
				}
				buffer = "";
			}
		}
		return result;
	}


	function getBandInterval(band) {
		var lowerBound = null;
		var upperBound = null;
		
		// If there are numbers in this div, they represent isInclusive limits
		var numbers = band.find('.number');
		if (numbers.length > 2) {
			throw "More than two limit numbers in a band!";
		}
		numbers.each(function(index) {
			thisDiv = $(this).parent();
			if (!thisDiv.prev().length) {
				lowerBound = new IntervalBound(parseFloat($(this).text()), true);
			} else {
				if (thisDiv.next().length) {
					throw "number's div found and it's not first or last in a band";
				}
				upperBound = new IntervalBound(parseFloat($(this).text()), true);
			}
		});
		
		// Infinities mark the topmost and bottom-most band
		if (band.find('.plusinfinity').length) {
			if (upperBound) {
				throw "band has upper limit -AND- plus infinity";
			}
			upperBound = new IntervalBound(Infinity, false);
		}
		if (band.find('.minusinfinity').length) {
			if (lowerBound) {
				throw "band has lower limit -AND- minus infinity";
			}
			lowerBound = new IntervalBound(-Infinity, false);
		}
		
		// If we still are missing an upper or lower bound on this band,
		// we get an exclusive bound from a neighboring band
		if (!upperBound) {
			var nextBand = band.next();
			upperBound = new IntervalBound(
				parseFloat(nextBand.find(':first-child').find('.number').text()),
				false
			);
		}
		if (!lowerBound) {
			var prevBand = band.prev();
			lowerBound = new IntervalBound(
				parseFloat(prevBand.find(':last-child').find('.number').text()),
				false
			);
		}
		return new Interval(lowerBound, upperBound);
	}
	
	function resetBandInterval(band, interval) {
		// clear out any numeric divs or infinity divs
		band.find('.minusinfinity').remove();
		band.find('.plusinfinity').remove();
		band.find('.number').parent().remove();

		function makeInclusiveBoundDiv(bound, isUpper) {
			var limitButtonSpan = $(
				'<span>' + (isUpper ? upTriangleEntity : downTriangleEntity) + '</span>'
			);
			limitButtonSpan.addClass(isUpper ? 'limitup' : 'limitdown');
			limitButtonSpan.click(toggleLimitHandler);
			
			var numberSpan = $('<span>' + bound.value + '</span>');
			numberSpan.addClass('number');
			
			var numberDiv = $('<div></div>');
			numberDiv.append(limitButtonSpan);
			numberDiv.append(numberSpan);
			
			return numberDiv;
		}
		
		// add the upper and lower bounds if they are inclusive
		// or if they are infinities
		if (interval.lowerBound.value == -Infinity) {
			band.prepend($('<div>' + '-&infin;' + '<div>').addClass('minusinfinity'));
		} else {
			if (interval.lowerBound.isInclusive) {
				band.prepend(makeInclusiveBoundDiv(interval.lowerBound, false));
			}
		}
		
		if (interval.upperBound.value == Infinity) {
			band.append($('<div>' + '+&infin;' + '<div>').addClass('plusinfinity'));
		} else {
			if (interval.upperBound.isInclusive) {
				band.append(makeInclusiveBoundDiv(interval.upperBound, true));
			}
		}
	}
	
	function makeBandFromInterval(interval) {
		var result = $('<div class="band"></div>');		
		result.append($('<div><input class="entry" value=""></input></div>'));
		resetBandInterval(result, interval);
		return result;
	}
	
	function getBandEntry(band) {
		return band.find(".entry").val();
	}
	
	function setBandEntry(band, entry) {
		band.find(".entry").val(entry);
	}

	// adjusts a band's inclusiveness and fix any other bands so that
	// the change doesn't cause any overlaps.
	function adjustBandInclusionsAndFixOtherBands(band, isLowerInclusive, isUpperInclusive) {
		var interval = getBandInterval(band);
		
		if (isLowerInclusive !== interval.lowerBound.isInclusive) {
			var prevBand = band.prev();
			var prevInterval = getBandInterval(prevBand);
			if (prevInterval.upperBound.isInclusive == interval.lowerBound.isInclusive) {
				throw "Exclusive bound expected on previous band!";
			}
			
			interval.lowerBound.isInclusive = !interval.lowerBound.isInclusive;
			prevInterval.upperBound.isInclusive = !prevInterval.upperBound.isInclusive;
			
			resetBandInterval(band, interval);
			resetBandInterval(prevBand, prevInterval);
		}
		
		if (isUpperInclusive !== interval.upperBound.isInclusive) {
			var nextBand = band.next();
			var nextInterval = getBandInterval(nextBand);
			if (nextInterval.lowerBound.isInclusive == interval.upperBound.isInclusive) {
				throw "Exclusive bound expected on next band!";
			}
			
			interval.upperBound.isInclusive = !interval.upperBound.isInclusive;
			nextInterval.lowerBound.isInclusive = !nextInterval.lowerBound.isInclusive;
			
			resetBandInterval(band, interval);
			resetBandInterval(nextBand, nextInterval);
		}
	}
	
	function toggleLimitHandler(event) {
		var limitButtonSpan = $(this);
		var numberDiv = limitButtonSpan.parent();
		var band = numberDiv.parents('.band');
		var interval = getBandInterval(band);

		// upper bounds have triangles pointing downward
		// lower bounds have triangles pointing upward
		var isLowerBoundBecomingExclusive = limitButtonSpan.hasClass('limitdown');
		if (isLowerBoundBecomingExclusive) {
			if (!interval.lowerBound.isInclusive) {
				throw "Inclusive toggle clicked on non-inclusive bound!";
			}
		} else {
			if (!interval.upperBound.isInclusive) {
				throw "Inclusive toggle clicked on non-inclusive bound!";
			}
		}
		
		if (isLowerBoundBecomingExclusive) {
			adjustBandInclusionsAndFixOtherBands(band, false, interval.upperBound.isInclusive);
		} else {
			adjustBandInclusionsAndFixOtherBands(band, interval.lowerBound.isInclusive, false);
		}
	}

	function respondToChange(event) {
		// convert the old bands into history records before deleting them...
		var allBandsDiv = $('#allbands');
		var newAllBandsDiv = $('<div></div>');
		
		var uniqueNumbers = extractUniqueNumbersFromString($(this).val());
		uniqueNumbers.sort(ascendingNumericCompare);

		var index = 0;

		var lowerBound = null;
		var upperBound = new IntervalBound(-Infinity, false);

		function outputBand() {
			newAllBandsDiv.append(makeBandFromInterval(new Interval(lowerBound, upperBound)).addClass(index % 2 ? 'odd' : 'even'));
		}
		
		for (index = 0; index < uniqueNumbers.length; index++) {
			lowerBound = upperBound;
			lowerBound.isInclusive = !lowerBound.isInclusive;
			upperBound = new IntervalBound(uniqueNumbers[index], true);
			outputBand();
		}
		
		lowerBound = upperBound;
		lowerBound.isInclusive = !lowerBound.isInclusive;
		upperBound = new IntervalBound(Infinity, false);
			
		outputBand();

		// We look through the history and see if any ranges kept the same
		// bound values after the modification.  If they did, we preserve
		// the entry that the user gave for that.
		
		allBandsDiv.children().each(function(index) {
			$(this).addClass("trashed");
		});
		
		newAllBandsDiv.children().each(function(newIndex) {
			var newBand = $(this);
			var newInterval = getBandInterval(newBand);
			
			allBandsDiv.children().each(function(oldIndex) {
				var oldBand = $(this);
				var oldInterval = getBandInterval(oldBand);
				
				if ((oldInterval.lowerBound.value == newInterval.lowerBound.value) &&
						(oldInterval.upperBound.value == newInterval.upperBound.value)) {
					adjustBandInclusionsAndFixOtherBands(newBand,
							oldInterval.lowerBound.isInclusive,
							oldInterval.upperBound.isInclusive
					);
					setBandEntry(newBand, getBandEntry(oldBand));
					oldBand.removeClass("trashed");
				}
			});
		});
		
		// If an edit to the number sequence lost any of our data inside ranges,
		// rather than throw it away we put it off to the side into a history.
		// The user may resurrect it if they wish (decent UI not yet implemented)
		allBandsDiv.children().each(function(index) {
			var maybeTrashedBand = $(this);
			if (maybeTrashedBand.hasClass("trashed") && getBandEntry(maybeTrashedBand).length) {
				$("#trashcan").append('<li>' +
						getBandInterval(maybeTrashedBand) + ' => ' +
						getBandEntry(maybeTrashedBand) + '</li>');
			}
		});
		
		allBandsDiv.empty();
		allBandsDiv.append(newAllBandsDiv.children().detach());
	}



// Exported module functions

	Numband.cleanUpInput = function() {
		var numberlistTextarea = $('#numberlist');
		var uniqueNumbers = extractUniqueNumbersFromString(numberlistTextarea.val());
		numberlistTextarea.val(uniqueNumbers.sort(ascendingNumericCompare).join(' '));
	};



// Module init code, runs once

	$('#numberlist').keyup(respondToChange);
	respondToChange(null);

});