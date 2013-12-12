/*
 *     Copyright (c) 2013 CoNWeT Lab., Universidad Politécnica de Madrid
 *     Copyright (c) 2013 IGN - Instituto Geográfico Nacional
 *     Centro Nacional de Información Geográfica
 *     http://www.ign.es/
 *
 *     This file is part of the GeoWidgets Project,
 *
 *     http://conwet.fi.upm.es/geowidgets
 *
 *     Licensed under the GNU General Public License, Version 3.0 (the 
 *     "License"); you may not use this file except in compliance with the 
 *     License.
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     under the License is distributed in the hope that it will be useful, 
 *     but on an "AS IS" BASIS, WITHOUT ANY WARRANTY OR CONDITION,
 *     either express or implied; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *  
 *     See the GNU General Public License for specific language governing
 *     permissions and limitations under the License.
 *
 *     <http://www.gnu.org/licenses/gpl.txt>.
 *
 */

use("conwet.parser");

conwet.parser.Parser = Class.create({

    initialize: function() {
    },

    parseRSS: function(rss) {
        var doc = OpenLayers.Format.XML.prototype.read(rss);

        var name = doc.getElementsByTagNameNS('*', 'title');
        if (name.length > 0) {
            name = name[0].firstChild.nodeValue;
        }
        else {
            name = doc.getElementsByTagName('title')[0].firstChild.nodeValue;
        }

        var chan = {
            "name": name,
            "features": []
        };

        var format = new OpenLayers.Format.GeoRSS({
            "externalProjection": new OpenLayers.Projection('EPSG:4326'),
            "internalProjection": new OpenLayers.Projection('EPSG:4326')
        });
        var features = format.read(doc);
        
        var dates = doc.getElementsByTagNameNS("*","updated"); //For ATOM
        if (dates.length == 0)
            dates = doc.getElementsByTagNameNS("*","date");
        if (dates.length == 0) 
            dates = doc.getElementsByTagNameNS("*","pubDate");
        

        for (var i=0; i<features.length; i++) {
            var feature = features[i];
            
            var newFeature = {
                title:       (feature.attributes.title)? feature.attributes.title: "Sin titulo",
                description: (feature.attributes.description)? feature.attributes.description: "Sin descripción.",
                link:        (feature.attributes.link)? feature.attributes.link: "",
                date:        this.formatDate((i+1 < dates.length) ? dates[i+1].textContent : "")
            }
            
            if (feature.geometry != null)
                newFeature.location = this.formatLocation(feature.geometry.getBounds().getCenterLonLat());
            
            chan.features.push(newFeature);
            
        }

        return chan;
    },

    _truncateNumber: function(number) {
        var precision = 10000;
        return (Math.round(number*precision))/precision;
    },

    formatLocation: function(location) {
        return new OpenLayers.LonLat(this._truncateNumber(location.lon), this._truncateNumber(location.lat));
    },

    formatDate: function(date) {
        if (!date || date == "")
            return "";

        date = new Date(date);
        return this.numberToString(date.getDate()) + "/" + this.numberToString(date.getMonth()+1) + "/" + date.getFullYear() +
                " " + this.numberToString(date.getHours()) + ":" + this.numberToString(date.getMinutes());
    },

    numberToString: function(number) {
        return ((number < 10)? "0":"") + number;
    }


});

