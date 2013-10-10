/*
 *     Copyright (c) 2013 CoNWeT Lab., Universidad Politécnica de Madrid
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

use("conwet");

conwet.Gadget = Class.create({

    initialize: function() {
        //Variables
        this.locationInfoEvent = new conwet.events.Event('location_info_event');
        this.locationEvent     = new conwet.events.Event('location_event');
        this.linkUrlEvent      = new conwet.events.Event('link_url_event');

        this.feedUrlPref       = MashupPlatform.widget.getVariable("feed_url_pref");
        this.rssServiceSlot    = new conwet.events.Slot('rss_service_slot', function(service) {
            service = JSON.parse(service);
            if (typeof service == 'object') {
                if (('type' in service) && ('url' in service) && (service.type == "RSS") && (service.url != "")) {
                    this.getRSS(service.url);
                    this.feedUrlPref.set(service.url);
                }
            }
        }.bind(this));

        this.getRSS(this.feedUrlPref.get());
    },

    /*
     * This functions sends an event with the locations to be highlighted.
     */
    highlightLocations: function(locations) {
        this.locationEvent.send(JSON.stringify(locations));
    },

    /*
     * This function sends and event with the location info
     */
    sendLocationInfo: function(locations) {
        this.locationInfoEvent.send(JSON.stringify(locations));
    },

    /*
     * This function makes an asynchronous request to the RSS service and the draws the info.
     */
    getRSS: function(url) {
        if (url == "") {
            this.showMessage(_("Introduzca una URL en las preferencias de usuario del gadget."));
            return;
        }

        MashupPlatform.http.makeRequest(url, {
            method: 'GET',
            onSuccess: function(transport) {
                this.drawRSS(transport.responseText);
            }.bind(this),
            onFailure : function(transport, e){
                $('reloadImg').show();
                $('reloadingImg').hide();
                this.showMessage(_("La url del feed no es válida."));
            }.bind(this)
        });
        
    },
    
    /*
     * This function draws the interface with the rss data. 
     * Note: it cleans all the user interface.
     */
    drawRSS: function(rss) {
        this.clearUI();

        var parser = new conwet.parser.Parser();
        var chan = parser.parseRSS(rss);
        var nameDiv = document.createElement('div');
        if (("link" in chan) && (chan.link != "")) {
            nameDiv.appendChild(this._createLinkElement(chan.name, chan.link));
        }
        else {
            nameDiv.appendChild(document.createTextNode(chan.name));
        }
        nameDiv.addClassName("rss_server_name");
        $("chan_title").appendChild(nameDiv);
        
        //Create the reload button
        var reloadImg = document.createElement('img');
        reloadImg.id = "reloadImg";
        reloadImg.addClassName("rss_reload");
        reloadImg.src = 'img/reload.png';
        reloadImg.onclick = function(){
            $('reloadImg').hide();
            $('reloadingImg').show();
            this.getRSS(this.feedUrlPref.get());
        }.bind(this);
        $("chan_title").appendChild(reloadImg);
        
        //Create the reloading imagen and hide it
        var reloadingImg = document.createElement('img');
        reloadingImg.id = "reloadingImg";
        reloadingImg.addClassName("rss_reload");
        reloadingImg.src = 'img/reloading.gif';
        $(reloadingImg).hide();
        $("chan_title").appendChild(reloadingImg);

        var locationInfos = [];
        for (var i=0; i<chan.features.length; i++) {
            var feature = chan.features[i];

            //Add this point to the list of locationInfo
            locationInfos.push({
                        lon: feature.location.lon,
                        lat:feature.location.lat,
                        title: feature.title
                    });
            
            var div = document.createElement("div");
            $(div).addClassName("feature");

            var context = {
                "div": div,
                "feature": feature,
                "self": this
            };

            div.appendChild(document.createTextNode(feature.title));
            div.observe("click", function(e) {
                this.self._selectFeature(this.feature, this.div);
                this.self.highlightLocations({
                        lon: this.feature.location.lon,
                        lat:this.feature.location.lat
                    });
            }.bind(context));
            div.observe("mouseover", function(e) {
                this.div.addClassName("highlight");
            }.bind(context), false);
            div.observe("mouseout", function(e) {
                this.div.removeClassName("highlight");
            }.bind(context), false);
            $("chan_items").appendChild(div);
        }
        
        //Send the points to be rendered in the map
        this.sendLocationInfo(locationInfos);
    },

    _selectFeature: function(feature, element) {
        this._deselectAllFeatures();
        element.addClassName("selected");
        this._showDetails(feature);
    },

    _deselectAllFeatures: function() {
        var features = $("chan_items").childNodes;
        for (var i=0; i<features.length; i++) {
            features[i].removeClassName("selected");
        }
    },

    _showDetails: function(feature) {
        this._clearDetails();

        var headElement = document.createElement("div");
        headElement.addClassName("info_head");
        $("info").appendChild(headElement);

        var titleElement = document.createElement("div");
        titleElement.addClassName("info_title");
        headElement.appendChild(titleElement);

        if (feature.link != "") {
            titleElement.appendChild(this._createLinkElement(feature.title, feature.link));
        }
        else {
            titleElement.appendChild(document.createTextNode(feature.title));
        }

        var dateElement = document.createElement("div");
        dateElement.addClassName("info_date");
        dateElement.appendChild(document.createTextNode(feature.date));
        headElement.appendChild(dateElement);

        var locationElement = document.createElement("div");
        locationElement.addClassName("info_location");
        locationElement.appendChild(document.createTextNode(feature.location.lon + ", " + feature.location.lat));
        headElement.appendChild(locationElement);

         var descriptionElement = document.createElement("div");
        descriptionElement.addClassName("info_description");
        descriptionElement.innerHTML = feature.description;
        $("info").appendChild(descriptionElement);

        var links = descriptionElement.getElementsByTagName("a");
        for (var i=links.length-1; i>=0; i--) {
            this._replaceLinkElement(links[i]);
        };
    },

    _replaceLinkElement: function(aElement) {
        if (aElement.mailto && (aElement.mailto != "")) {
            return;
        }
        var linkElement = this._createLinkElement(aElement.innerHTML, aElement.href);
        aElement.parentNode.insertBefore(linkElement, aElement);
        aElement.parentNode.removeChild(aElement);
    },

    _createLinkElement: function(value, href) {
        var link = document.createElement("span");
        $(link).addClassName("link");
        link.title = _("Send Event");
        link.innerHTML = value;
        link.observe("click", function() {
            this.linkUrlEvent.send(href);
        }.bind(this));
        return link;
    },

    _clearDetails: function() {
        $("info").innerHTML = "";
    },

    clearUI: function(message, time) {
        this._clearDetails();
        $("chan_title").innerHTML = "";
        $("chan_items").innerHTML = "";
    },

    showMessage: function(message, time) {
        this.clearUI();
        $("chan_items").innerHTML = message;
    }

});
