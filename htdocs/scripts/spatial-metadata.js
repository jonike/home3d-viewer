/*
The MIT License (MIT)

Copyright (c) 2016 Markus Broecker <broecker@wisc.edu>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/*global
	obb, mat4, renderer, shaders, vec4, gl, Math
*/

var metadata = metadata || {};

metadata.load = function(jsonUrl) {
	"use strict";

	metadata.items = [];
	metadata.alignmentMatrix = mat4.create();
	metadata.ceiling = -1;
	metadata.floor = 0;

	// parse json file here
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function () {
		var i, k, bbox, ax, ay, az, itemNo, container, div, textNode;

		if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {

			// remove all newline
			var items = xmlhttp.response.replace(/(\r\n|\n|\r)/gm,"");

			metadata.items = JSON.parse(items);

			//console.log(metadata.items);

			// parse the data
			for (i in metadata.items) {

				// create oriented bounding boxes
				bbox = obb.create();
				bbox.position = metadata.items[i].bbox_position;
				bbox.halfBounds = metadata.items[i].bbox_scale;
				
				ax = metadata.items[i].bbox_axis_x;
				ay = metadata.items[i].bbox_axis_y;
				az = metadata.items[i].bbox_axis_z;

				bbox.xAxis = [ax[0], ax[2], -ax[1]];
				bbox.yAxis = [ay[0], ay[2], -ay[1]];
				bbox.zAxis = [az[0], az[2], -az[1]];

				bbox.name = "OrientedBoundingBox";

				
				bbox.matrix = mat4.create();
				for (k = 0; k < 16; k += 1) {
					bbox.matrix[k] = metadata.items[i].bbox_matrix[k];
				}

				metadata.items[i].bbox = bbox;

				delete metadata.items[i].bbox_matrix;
				delete metadata.items[i].bbox_position;
				delete metadata.items[i].bbox_scale;
				delete metadata.items[i].bbox_axis_x;
				delete metadata.items[i].bbox_axis_y;
				delete metadata.items[i].bbox_axis_z;



				// create the AAT link from the AAT id
				itemNo = metadata.items[i].aat_id;

				metadata.items[i].aat_link = 'http://www.getty.edu/vow/AATFullDisplay?find=' + itemNo;
				metadata.items[i].aat_link +='&logic=AND&note=&english=N&prev_page=1&subjectid=' + itemNo;

				// also append the text to the document

				container = document.getElementById("metadata-labels");

				div = document.createElement("div");
				div.className = "floating-div";
				div.id = metadata.items[i].name;

				textNode = document.createTextNode(metadata.items[i].name);
				div.appendChild(textNode);

				container.appendChild(div);


				metadata.items[i].htmlElement = div;


			}
	
			console.log("Loaded " + metadata.items.length + " metadata entries.");
			console.log(metadata.items);



		}

		if (xmlhttp.status === 404) { 
			console.error('Unable to load metadata - not present?');
			console.error('Metadata path: ' + jsonUrl);

			// disable metadata button
			renderer.enableMetadata = false;

			var bbar = document.getElementById("buttons");
			var mdb = document.getElementById("mdbutton");

			if (bbar && mdb) {	
				bbar.removeChild(mdb);
			}
		}

	};

	xmlhttp.open("GET", jsonUrl, true);
	xmlhttp.send();

};

metadata.loadRegistration = function(jsonUrl) {
	"use strict";
	

	// load registration file
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function () {
		if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {

			// remove all newline
			var items = xmlhttp.response.replace(/(\r\n|\n|\r)/gm,"");

			items = JSON.parse(items);

			console.log(items);

			// setting the alignment here
			mat4.rotate(metadata.alignmentMatrix, metadata.alignmentMatrix, Math.PI/2, [-1,0,0]);
			mat4.translate(metadata.alignmentMatrix, metadata.alignmentMatrix, items.translation); //[1.4, -1, 2.25]);

			if (items.ceiling !== undefined) {
				metadata.ceiling = items.ceiling;
			}

			if (items.floor !== undefined) {
				metadata.floor = items.floor;
			}

		}

		if (xmlhttp.status === 404) { 
			console.error('Unable to load registration - not present?');
			console.error('registration path: ' + jsonUrl);
		}

	};

	

	xmlhttp.open("GET", jsonUrl, true);
	xmlhttp.send();
};


metadata.draw = function(shader) {
	"use strict";
	
	var e, item;

	if (!shader) {
		return;
	}

	for (e in metadata.items) { 
		
		item = metadata.items[e];
		
		if (item.bbox) {
			
            obb.draw(item.bbox, shader);

		}
	}

};

metadata.drawText = function() { 
	"use strict";
	
	var e, item, c, v, pixelX, pixelY;

	// draw text here

	// create correct transformation matrix
	var m = mat4.create();

	mat4.multiply(m, renderer.modelViewProjection, metadata.alignmentMatrix);


	for (e in metadata.items) { 
		item = metadata.items[e];


		c = item.bbox.position; 
		v = vec4.fromValues(c[0], c[1], c[2], 1);

		vec4.transformMat4(v, v, m);
	     
	   
	    // homogenous transform
		vec4.scale(v, v, 1.0 / v[3]);

		pixelX = (v[0] *  0.5 + 0.5) * gl.canvas.width;
		pixelY = (v[1] * -0.5 + 0.5) * gl.canvas.height;


	    //console.log(c, pixelX, pixelY);

		item.htmlElement.style.left = Math.floor(pixelX) + "px";
		item.htmlElement.style.top  = Math.floor(pixelY) + "px";
		item.htmlElement.style.alignContent="center";
		item.htmlElement.style.alignSelf="center";
			
	}
};
