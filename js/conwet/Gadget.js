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

use("conwet");

conwet.Gadget = Class.create({

    initialize: function() {
        
        this.messageManager = new conwet.ui.MessageManager(3000);
        
        //Variables
        this.locationInfoEvent = new conwet.events.Event('location_info_event');
        this.highlightLocationEvent     = new conwet.events.Event('highlight_location_event');
        this.linkUrlEvent      = new conwet.events.Event('link_url_event');

        this.feedUrlPref       = MashupPlatform.widget.getVariable("feed_url_pref");
        this.rssServiceSlot    = new conwet.events.Slot('rss_service_slot', function(service) {
            service = JSON.parse(service);
            if (typeof service == 'object') {
                if (('type' in service) && ('url' in service) && (service.type == "RSS") && (service.url != "")) {
                    
                    //Clear the news list
                    this.clear();
                    
                    //Stop the update interval
                    this.clearUpdateInterval();
                    
                    //Get the new RSS info
                    this.getRSS(service.url, false, true);
                    
                    //Set this as the current RSS service
                    this.feedUrlPref.set(service.url);
                    
                    //Start a new update interval
                    this.launchUpdateInterval();
                }
            }
        }.bind(this));
        
        this.highlightLocationSlot = new conwet.events.Slot('highlight_location_slot', function(loc){
            
            //Get lon lat values
            var lonlat = loc.split(",");
            
            //Round the coordinates
            var parser = new conwet.parser.Parser();
            lonlat[0] = parser._truncateNumber(lonlat[0]);
            lonlat[1] = parser._truncateNumber(lonlat[1]);
            
            //Select the entry if exists in the list
            this.handleHighlightLocation({lon: lonlat[0], lat: lonlat[1]});
            
        }.bind(this));
        
        this.updating = false; //Whether the widget is currently updating the data or not
        this.displayedNews = [];
        this.locationInfos = [];
        
        this.draw();
        this.getRSS(this.feedUrlPref.get(), false, true);
        
        //Launch an update interval
        this.launchUpdateInterval();
    },
     
    launchUpdateInterval: function(){
        this.interval = setInterval(function(){
            if(!this.updating)
                this.getRSS(this.feedUrlPref.get(), true, false);
        }.bind(this),60000);
    },
            
    clearUpdateInterval: function(){
        clearInterval(this.interval);
    },
            
    draw: function(){

        var nameDiv = document.createElement('div');

        nameDiv.appendChild(document.createTextNode(_("Añada un servidor GeoRSS")));
        nameDiv.id = "rss_server_name";
        nameDiv.addClassName("rss_server_name");
        $("chan_title").appendChild(nameDiv);
        
        //Create the reload button
        var reloadImg = document.createElement('img');
        reloadImg.id = "reloadImg";
        reloadImg.addClassName("rss_reload");
        reloadImg.src = 'img/reload.png';
        reloadImg.onclick = function(){
            this.getRSS(this.feedUrlPref.get(), true, true);
        }.bind(this);
        $("chan_title").appendChild(reloadImg);
        
        //Create the reloading image and hide it
        var reloadingImg = document.createElement('img');
        reloadingImg.id = "reloadingImg";
        reloadingImg.addClassName("rss_reload");
        reloadingImg.src = 'img/reloading.gif';
        $(reloadingImg).hide();
        $("chan_title").appendChild(reloadingImg);

    },

    /*
     * This functions sends an event with the locations to be highlighted.
     */
    highlightLocations: function(locations) {
            this.highlightLocationEvent.send(JSON.stringify(locations));
    },

    /*
     * This function sends and event with the list of location infos
     */
    sendLocationInfo: function(locations) {
        if(locations.length)
            this.locationInfoEvent.send(JSON.stringify(locations));
    },
    
    /**
     * 
     */        
    handleHighlightLocation: function(location){

        //Search the entry and, if found, select it
        for(var entryTitle in this.displayedNews){
            var entry = this.displayedNews[entryTitle];
            var entryLocation = entry.feature.location;
            if(entryLocation != null && entryLocation.lon == location.lon && entryLocation.lat == location.lat){
                this._selectFeature(entry.feature, entry.div);
                break;
            }
        }

    },

    /*
     * This function makes an asynchronous request to the RSS service and the draws the info.
     */
    getRSS: function(url, silent, forceSend) {
        if (url == "") {
            //this.showMessage(_("Introduzca una URL en las preferencias de usuario del gadget."));
            return;
        }
        
        $('reloadImg').hide();
        $('reloadingImg').show();
        
        if(!silent)
            this.showMessage("Solicitando datos al servidor.", true);
        
        //Set the status to updating.
        //The interval cant update is there is already an update in process
        this.updating = true;
	
	if (url.toLowerCase().indexOf("rsstogeorss")!== -1)	
		url += "&username=avera";
        
        MashupPlatform.http.makeRequest(url, {
            method: 'GET',
            onSuccess: function(transport) {
                if(!silent)
                    this.hideMessage();
                try{
                    this.drawRSS(transport.responseText, forceSend);
                }catch(e){ };
                $('reloadImg').show();
                $('reloadingImg').hide();
                this.updating = false;
            }.bind(this),
            onFailure : function(transport, e){
                $('reloadImg').show();
                $('reloadingImg').hide();
                if(!silent)
                    this.showError("El servidor no responde.");
                this.updating = false;
            }.bind(this)
        });
        
    },
    
    /*
     * This function draws the interface with the rss data. 
     * Note: it cleans all the user interface.
     */
    drawRSS: function(rss, forceSend) {

        var parser = new conwet.parser.Parser();
        var chan = parser.parseRSS(rss);
        var nameDiv = $("rss_server_name");
        nameDiv.innerHTML = "";
        if (("link" in chan) && (chan.link != "")) {
            nameDiv.appendChild(this._createLinkElement(chan.name, chan.link));
        }
        else {
            nameDiv.appendChild(document.createTextNode(chan.name));
        }
        
        
        var firstChild = $("chan_items").firstChild;
        var newInfo = false;
        
        for (var i=0; i<chan.features.length; i++) {
    
            var feature = chan.features[i];
            
            if(this.displayedNews[feature.title] != null)
                continue; //It is already displayed
            
            //There is new info to be sent
            newInfo = true;

            //Add this point to the list of locationInfo
            if(feature.location != null){
                this.locationInfos.push({
                    lon: feature.location.lon,
                    lat:feature.location.lat,
                    title: feature.title,
                    coordinates: feature.location.lon + "," +feature.location.lat
                });
            }
            
            var div = document.createElement("div");
            $(div).addClassName("feature");

            var context = {
                div: div,
                feature: feature,
                self: this
            };
            
            //Add it to the list of displayed news
            this.displayedNews[feature.title] = {
                div: div,
                feature: feature
            };

            div.appendChild(document.createTextNode(feature.title));
            div.observe("click", function(e) {
                this.self._selectFeature(this.feature, this.div);
                if(this.feature.location != null){
                    this.self.highlightLocations({
                        lon: this.feature.location.lon,
                        lat:this.feature.location.lat,
                        coordinates: this.feature.location.lon + "," +this.feature.location.lat
                    });
                }
            }.bind(context));
            div.observe("mouseover", function(e) {
                this.div.addClassName("highlight");
            }.bind(context), false);
            div.observe("mouseout", function(e) {
                this.div.removeClassName("highlight");
            }.bind(context), false);
            
            //Add new info just before the old info
            $("chan_items").insertBefore(div, firstChild);
        }
        
        //Send the points to be rendered in the map
        if(newInfo || forceSend)
            this.sendLocationInfo(this.locationInfos);
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

        if(feature.location != null){
            var locationElement = document.createElement("div");
            locationElement.addClassName("info_location");
            locationElement.appendChild(document.createTextNode(feature.location.lon + ", " + feature.location.lat));
            headElement.appendChild(locationElement);
        }

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

    clear: function(message, time) {
        this._clearDetails();
        this.displayedNews = [];
        this.locationInfos = [];
        $("chan_items").innerHTML = "";
    },

    showMessage: function(message, permanent) {
        this.messageManager.showMessage(message, conwet.ui.MessageManager.INFO, permanent);
    },

    hideMessage: function() {
        this.messageManager.hideMessage();
    },

    showError: function(message, permanent) {
        this.messageManager.showMessage(message, conwet.ui.MessageManager.ERROR, permanent);
    }

});
