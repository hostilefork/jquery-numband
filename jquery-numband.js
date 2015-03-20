//
// jquery-numband.js
// Code demonstrating a prototype for mapping numeric ranges to values
// Copyright (c) 2010 HostileFork.com
//
// MIT license:
//   http://www.opensource.org/licenses/mit-license.php
//
// For more information, see http://jquery-numband.hostilefork.com
// For UX StackExchange origins, see http://ux.stackexchange.com/a/2922
//


// http://stackoverflow.com/questions/1335851/
// http://stackoverflow.com/questions/4462478/
"use strict";


// Interval class for representing a mathematical interval, which consists of
// two IntervalBound objects:
//
//     http://en.wikipedia.org/wiki/Interval_%28mathematics%29

function IntervalBound(value, isInclusive) {
    if ((typeof value !== typeof 1) || isNaN(value))
        throw Error("Interval value must be a Number.");

    // Consistent with mathematics, infinities are never inclusive.

    if (!isFinite(value) && isInclusive)
        throw Error("infinite IntervalBound cannot be inclusive");
    
    this.value = value;
    this.isInclusive = isInclusive ? true : false;
    

    // MEMBER FUNCTIONS

    this.equals = function(other) {
        return (other.value == this.value)
            && (other.isInclusive == this.isInclusive);
    };
}


function Interval(lowerBound, upperBound) {
    if (
        !(lowerBound instanceof IntervalBound)
        || !(upperBound instanceof IntervalBound)
    ) {
        throw Error("Interval requires two IntervalBound instances");
    }

    if (lowerBound.value > upperBound.value)
        throw Error("Interval must range from smaller to larger values");
    
    if (lowerBound.value == upperBound.value)
        throw Error("Interval bounds (currently) must be distinct"); 
    
    this.lower = lowerBound;
    this.upper = upperBound;

    
    // MEMBER FUNCTIONS

    this.containsValue = function(value) {
        if ((typeof value !== typeof 1) || isNaN(value) || !isFinite(value))
            throw Error("Interval.containsValue only works with reals.");
        
        return (((value > this.lower.value) || 
            (this.lower.isInclusive && (value == this.lower.value)))
            && ((value < this.upper.value) ||
            (this.upper.isInclusive && (value == this.upper.value))));
    };

    
    this.equals = function(other) {
        return this.lower.equals(other.lower) && this.upper.equals(other.upper);
    };


    // Notationally, square brackets are used for an included endpoint, while
    // parentheses are used for excluded endpoint.  Hence [10,20) would be
    // an interval that contained 10 and everything up to 20, but doesn't
    // include 20 itself.
    //
    // http://en.wikipedia.org/wiki/ISO_31-11

    this.toString = function() {
        var result = "";
        
        if (lowerBound.isInclusive)
            result += "[ ";
        else
            result += "( ";
    
        if (lowerBound.value == -Infinity)
            // could use "-inf" but that wouldn't parseFloat
            result += lowerBound.value; 
        else
            result += lowerBound.value;
        
        result += " , ";

        if (upperBound.value == Infinity)
            // could use "+inf" but that wouldn't parseFloat
            result += upperBound.value;
        else
            result += upperBound.value;
                  
        if (upperBound.isInclusive)
            result += " ]";
        else
            result += " )";
        
        return result;
    };
}


// REVIEW: assumes strict format as produced by Interval.toString()

function parseInterval(str) {
    var tokens = str.split(" ");
    if (tokens.length != 5)
        throw Error("parseInterval expected exactly 5 tokens");

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
    // Finds both floats and integers.
    function extractUniqueNumbersFromString(str) {
        var numericChars = "1234567890.";
        var result = [];
        var buffer = "";
        var nextMaybeNegative = false;
        
        for (var index = 0; index < str.length; index++) {
            // For why charAt vs. [], see:
            // http://stackoverflow.com/a/5943760

            var ch = str.charAt(index);

            // We don't want to interpret 10-20 as 10 and -20 because that
            // looks very much like a range notation.  (So does 10 - 20)  We
            // only accept it to make things negative if the building buffer is
            // empty AND the next number is a digit.

            if ((ch == '-') && !buffer) {
                nextMaybeNegative = true;
                continue;
            }

            var isNumericChar = (numericChars.indexOf(ch) != -1);
            if (isNumericChar) {
                if (nextMaybeNegative)
                    buffer += '-';

                buffer += ch;
            }

            nextMaybeNegative = false;

            if (!isNumericChar || (index == str.length - 1)) {
                var value = null;
                if (buffer.length) {
                    value = parseFloat(buffer);
                    if (!isNaN(value) && result.indexOf(value) == -1)
                        result.push(value);
                }
                buffer = "";
            }
        }
        return result;
    }


    function getBandInterval(band) {
        var lower = null;
        var upper = null;
        
        // If there are numbers in this div, they represent isInclusive limits

        var numbers = band.find('.number');
        if (numbers.length > 2)
            throw Error("More than two limit numbers in a band!");

        numbers.each(function(index) {
            var thisDiv = $(this).parent();
            if (!thisDiv.prev().length)
                lower = new IntervalBound(parseFloat($(this).text()), true);
            else {
                if (thisDiv.next().length)
                    throw Error("div not first or last in a band!");

                upper = new IntervalBound(parseFloat($(this).text()), true);
            }
        });
        
        // Infinities mark the topmost and bottom-most band

        if (band.find('.plusinfinity').length) {
            if (upper)
                throw Error("band has upper limit -AND- plus infinity");

            upper = new IntervalBound(Infinity, false);
        }

        if (band.find('.minusinfinity').length) {
            if (lower)
                throw Error("band has lower limit -AND- minus infinity");

            lower = new IntervalBound(-Infinity, false);
        }
        
        // If we still are missing an upper or lower bound on this band,
        // we get an exclusive bound from a neighboring band

        if (!upper) {
            var nextBandFirst = band.next().find(':first-child');
            upper = new IntervalBound(
                parseFloat(nextBandFirst.find('.number').text()), false
            );
        }

        if (!lower) {
            var prevBandLast = band.prev().find(':last-child');
            lower = new IntervalBound(
                parseFloat(prevBandLast.find('.number').text()), false
            );
        }
        return new Interval(lower, upper);
    }
    

    function resetBandInterval(band, interval) {
        // clear out any numeric divs or infinity divs

        band.find('.minusinfinity').remove();
        band.find('.plusinfinity').remove();
        band.find('.number').parent().remove();

        function makeInclusiveBoundDiv(bound, isUpper) {
            var limitButtonSpan = $(
                '<span>'
                + (isUpper ? upTriangleEntity : downTriangleEntity)
                + '</span>'
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

        if (interval.lower.value == -Infinity) {
            band.prepend(
                $('<div>' + '-&infin;' + '<div>').addClass('minusinfinity')
            );
        } else {
            if (interval.lower.isInclusive)
                band.prepend(makeInclusiveBoundDiv(interval.lower, false));
        }
        
        if (interval.upper.value == Infinity) {
            band.append(
                $('<div>' + '+&infin;' + '<div>').addClass('plusinfinity')
            );
        } else {
            if (interval.upper.isInclusive)
                band.append(makeInclusiveBoundDiv(interval.upper, true));
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

    function adjustBandInclusions(band, isLowerInclusive, isUpperInclusive) {
        var interval = getBandInterval(band);
        
        if (isLowerInclusive !== interval.lower.isInclusive) {
            var prevBand = band.prev();
            var prevInterval = getBandInterval(prevBand);
            if (
                prevInterval.upper.isInclusive
                == interval.lower.isInclusive
            ) {
                throw Error("Exclusive bound expected on previous band!");
            }
            
            interval.lower.isInclusive = !interval.lower.isInclusive;
            prevInterval.upper.isInclusive = !prevInterval.upper.isInclusive;
            
            resetBandInterval(band, interval);
            resetBandInterval(prevBand, prevInterval);
        }
        
        if (isUpperInclusive !== interval.upper.isInclusive) {
            var nextBand = band.next();
            var nextInterval = getBandInterval(nextBand);
            if (
                nextInterval.lower.isInclusive 
                == interval.upper.isInclusive
            ) {
                throw Error("Exclusive bound expected on next band!");
            }
            
            interval.upper.isInclusive = !interval.upper.isInclusive;
            nextInterval.lower.isInclusive = !nextInterval.lower.isInclusive;
            
            resetBandInterval(band, interval);
            resetBandInterval(nextBand, nextInterval);
        }
    }
    
    function toggleLimitHandler(event) {
        var buttonSpan = $(this);
        var numberDiv = buttonSpan.parent();
        var band = numberDiv.parents('.band');
        var interval = getBandInterval(band);

        // upper bounds have triangles pointing downward
        // lower bounds have triangles pointing upward

        var isLowerBoundBecomingExclusive = buttonSpan.hasClass('limitdown');
        if (isLowerBoundBecomingExclusive) {
            if (!interval.lower.isInclusive)
                throw Error("Inclusive toggle on non-inclusive bound!");
        } else {
            if (!interval.upper.isInclusive)
                throw Error("Inclusive toggle on non-inclusive bound!");
        }
        
        if (isLowerBoundBecomingExclusive)
            adjustBandInclusions(band, false, interval.upper.isInclusive);
        else
            adjustBandInclusions(band, interval.lower.isInclusive, false);
    }

    function respondToChange(event) {
        // convert the old bands into history records before deleting them...

        var allBandsDiv = $('#allbands');
        var historyDiv = $('#history');

        // augment the history with the records from existing data
        // would be better to sort them

        allBandsDiv.children().each(function(index) {
            $(historyDiv).append('<li>' + 
                    '<span class="historyinterval">' +
                    getBandInterval($(this)) +
                    '</span>' + 
                    ' => ' +
                    '<span class="historyentry">' + 
                    getBandEntry($(this)) +
                    '</span>' +
                    '</li>'
            );
        }); 
        allBandsDiv.empty();

        var uniqueNumbers = extractUniqueNumbersFromString($(this).val());
        uniqueNumbers.sort(ascendingNumericCompare);

        var index = 0;

        var lowerBound = null;
        var upperBound = new IntervalBound(-Infinity, false);

        function outputBand() {
            allBandsDiv.append(makeBandFromInterval(
                new Interval(lowerBound, upperBound)).addClass(
                    index % 2 ? 'odd' : 'even')
                );
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
        
        allBandsDiv.children().each(function(newIndex) {
            var newBand = $(this);
            var newInterval = getBandInterval(newBand);
            
            historyDiv.children().each(function(oldIndex) {
                var historyItem = $(this);
                var oldInterval = parseInterval(
                    historyItem.find(".historyinterval").text()
                );
                
                if (
                    (oldInterval.lower.value == newInterval.lower.value)
                    && (oldInterval.upper.value == newInterval.upper.value)
                ) {
                    adjustBandInclusions(
                        newBand,
                        oldInterval.lower.isInclusive,
                        oldInterval.upper.isInclusive
                    );
                    setBandEntry(
                        newBand, historyItem.find(".historyentry").text()
                    );
                    historyItem.remove();
                }
            });
        });
        
        // We initially stored history items that had no entry text as they
        // help us capture any range inclusiveness/exclusiveness the user might
        // have entered.  But we only preserve that over a single edit... if
        // you adjust the range inclusiveness, don't enter a value, and change
        // so the range doesn't exist anymore... we forget.

        historyDiv.children().each(function(oldIndex) {
            if (!$(this).find(".historyentry").text())
                $(this).remove();
        });
    }



// EXPORTED MODULE FUNCTIONS

    Numband.cleanUpInput = function() {
        var textarea = $('#numberlist');
        var uniqueNumbers = extractUniqueNumbersFromString(textarea.val());
        textarea.val(uniqueNumbers.sort(ascendingNumericCompare).join(' '));
    };



// MODULE INIT CODE
//
// This runs only once

    $('#numberlist').keyup(respondToChange);
    respondToChange.apply($('#numberlist'), null);

});