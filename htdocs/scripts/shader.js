/*
The MIT License (MIT)

Copyright (c) 2015 Markus Broecker <broecker@wisc.edu>

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
	gl
*/

var shader = shader || {};

shader.createFromDOM = function(domID) {
	"use strict";

	// loads a shader with the given id from the DOM
	var shaderScript = document.getElementById(domID);
	if (!shaderScript) {
		return null;
	}

	var str = "";
	var k = shaderScript.firstChild;
	while (k) {
		if (k.nodeType === 3) {
			str += k.textContent;
		}
		k = k.nextSibling;
	}

	var subShader;
	if (shaderScript.type === "x-shader/x-fragment") {
		subShader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderScript.type === "x-shader/x-vertex") {
		subShader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;
	}

	gl.shaderSource(subShader, str);
	gl.compileShader(subShader);

	if (!gl.getShaderParameter(subShader, gl.COMPILE_STATUS)) {
		console.error(gl.getShaderInfoLog(subShader));
		return null;
	}

	return subShader;
};


/*	loading external file; modified from :
	http://stackoverflow.com/questions/4878145/javascript-and-webgl-external-scripts
*/
shader._loadFile = function(url, data, callback, errorCallback) {
    "use strict";
    // Set up an asynchronous request
    var request = new XMLHttpRequest();
    request.open('GET', url, true);

    // Hook the event that gets called as the request progresses
    request.onreadystatechange = function () {
        // If the request is "DONE" (completed or failed)
        if (request.readyState === 4) {
            // If we got HTTP status 200 (OK)
            if (request.status === 200) {
                callback(request.responseText, data);
            } else { // Failed
                errorCallback(url);
            }
        }
    };

    request.send(null);    
};

shader._loadFiles = function(urls, callback, errorCallback) {
    "use strict";
    var numUrls = urls.length;
    var numComplete = 0;
    var result = [];
    var i;

    // Callback for a single file
    function partialCallback(text, urlIndex) {
        result[urlIndex] = text;
        numComplete += 1;

        // When all files have downloaded
        if (numComplete === numUrls) {
            callback(result);
        }
    }

    for (i = 0; i < numUrls; i += 1) {
        shader._loadFile(urls[i], i, partialCallback, errorCallback);
    }
};

shader.loadAll = function(shaders, basepath) {
	"use strict";

	// loading grid shader 
	shaders.gridShader = null;	
	shader._loadFiles([basepath + 'shaders/grid.vert', basepath + 'shaders/grid.frag'], function (shaderText) {
		var vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, shaderText[0]);
		gl.compileShader(vertexShader);
		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(vertexShader));
		}


		var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragmentShader, shaderText[1]);
		gl.compileShader(fragmentShader);
		if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(fragmentShader));
		}

		var program = gl.createProgram();
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error("Could not initialize grid shader");
		}

		program.vertexPositionAttribute = gl.getAttribLocation(program, "positionIn");
		program.projMatrixUniform = gl.getUniformLocation(program, "projMatrix");
		program.viewMatrixUniform = gl.getUniformLocation(program, "viewMatrix");
		program.colorUniform = gl.getUniformLocation(program, "color");
		shaders.gridShader = program;

		}, function (url) {
		console.error('Failed to download "' + url + '"');
	}); 


	// loading object shader 
	shaders.objectShader = null;	
	shader._loadFiles([basepath + 'shaders/object.vert', basepath + 'shaders/object.frag'], function (shaderText) {
		var vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, shaderText[0]);
		gl.compileShader(vertexShader);
		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(vertexShader));
		}

		var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragmentShader, shaderText[1]);
		gl.compileShader(fragmentShader);
		if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(fragmentShader));
		}


		var program = gl.createProgram();
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error("Could not initialize object shader");
		}

		program.vertexPositionAttribute = gl.getAttribLocation(program, "positionIn");
		program.vertexNormalAttribute = gl.getAttribLocation(program, "normalIn");
		program.projMatrixUniform = gl.getUniformLocation(program, "projMatrix");
		program.viewMatrixUniform = gl.getUniformLocation(program, "viewMatrix");
		program.transformUniform = gl.getUniformLocation(program, "transform");
		program.colorUniform = gl.getUniformLocation(program, "color");
		program.lightDirectionUniform = gl.getUniformLocation(program, "lightDirection");


		shaders.objectShader = program;

		}, function (url) {
		console.error('Failed to download "' + url + '"');
	}); 

	// loading quad shader 
	shaders.quadShader = null;	
	shader._loadFiles([basepath + 'shaders/quad.vert', basepath + 'shaders/quad.frag'], function (shaderText) {
		var vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, shaderText[0]);
		gl.compileShader(vertexShader);
		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(vertexShader));
			
		}

		var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragmentShader, shaderText[1]);
		gl.compileShader(fragmentShader);
		if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(fragmentShader));
			
		}


		var program = gl.createProgram();
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error("Could not initialize quad shader");
		}

		program.vertexPositionAttribute = gl.getAttribLocation(program, "positionIn");
		program.colormapUniform = gl.getUniformLocation(program, "colormap");
		program.resolutionUniform = gl.getUniformLocation(program, "resolution");
		shaders.quadShader = program;

		}, function (url) {
		console.error('Failed to download "' + url + '"');
	}); 


	// load fxaa shader 
	shaders.fxaaShader = null;	
	shader._loadFiles([basepath + 'shaders/fxaa.vert', basepath + 'shaders/fxaa.frag'], function (shaderText) {
		var vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, shaderText[0]);
		gl.compileShader(vertexShader);
		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(vertexShader));
			
		}

		var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragmentShader, shaderText[1]);
		gl.compileShader(fragmentShader);
		if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(fragmentShader));
			
		}


		var program = gl.createProgram();
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error("Could not initialize fxaa shader");
		}

		program.vertexPositionAttribute = gl.getAttribLocation(program, "positionIn");
		program.colormapUniform = gl.getUniformLocation(program, "colormap");
		program.resolutionUniform = gl.getUniformLocation(program, "resolution");
		shaders.fxaaShader = program;

		}, function (url) {
		console.error('Failed to download "' + url + '"');
	}); 


	// load skybox shader 
	shaders.skyboxShader = null;	
	shader._loadFiles([basepath + 'shaders/skybox.vert', basepath + 'shaders/skybox.frag'], function (shaderText) {
		var vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, shaderText[0]);
		gl.compileShader(vertexShader);
		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(vertexShader));
			
		}

		var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragmentShader, shaderText[1]);
		gl.compileShader(fragmentShader);
		if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(fragmentShader));
			
		}


		var program = gl.createProgram();
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error("Could not initialize skybox shader");
		}

		program.vertexPositionAttribute = gl.getAttribLocation(program, "positionIn");
		program.inverseMVPUniform = gl.getUniformLocation(program, "inverseMVP");
		shaders.skyboxShader = program;

		}, function (url) {
		console.error('Failed to download "' + url + '"');
	}); 

	// load bounds shader 
	shaders.boundsShader = null;	
	shader._loadFiles([basepath + 'shaders/bounds.vert', basepath + 'shaders/bounds.frag'], function (shaderText) {
		var vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, shaderText[0]);
		gl.compileShader(vertexShader);
		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(vertexShader));
			
		}

		var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragmentShader, shaderText[1]);
		gl.compileShader(fragmentShader);
		if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(fragmentShader));
			
		}


		var program = gl.createProgram();
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error("Could not initialize bounds shader");
		}

		program.vertexPositionAttribute = gl.getAttribLocation(program, "positionIn");
		program.pointsUniform = gl.getUniformLocation(program, "pointsContained");
		program.areaUniform = gl.getUniformLocation(program, "projectedArea");
		shaders.boundsShader = program;

		}, function (url) {
		console.error('Failed to download "' + url + '"');
	}); 


	// load points shader 
	shaders.pointsShader = null;	
	shader._loadFiles([basepath + 'shaders/points.vert', basepath + 'shaders/points.frag'], function (shaderText) {
		var vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, shaderText[0]);
		gl.compileShader(vertexShader);
		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(vertexShader));
			
		}

		var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragmentShader, shaderText[1]);
		gl.compileShader(fragmentShader);
		if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(fragmentShader));
			
		}


		var program = gl.createProgram();
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error("Could not initialize pointcloud shader");
		}

		program.vertexPositionAttribute = gl.getAttribLocation(program, "positionIn");
		program.vertexColorAttribute = gl.getAttribLocation(program, "colorIn");
		program.projMatrixUniform = gl.getUniformLocation(program, "projMatrix");
		program.viewMatrixUniform = gl.getUniformLocation(program, "viewMatrix");
		program.modelMatrixUniform = gl.getUniformLocation(program, "modelMatrix");
		program.lodUniform = gl.getUniformLocation(program, "lodLevel");
		program.pointSizeUniform = gl.getUniformLocation(program, "pointSize");
		program.minPointSizeUniform = gl.getUniformLocation(program, "minPointSize");
		program.viewportHeightUniform = gl.getUniformLocation(program, "viewportHeight");
		program.ceilingUniform = gl.getUniformLocation(program, "ceiling");
		shaders.pointsShader = program;

		}, function (url) {
		console.error('Failed to download "' + url + '"');
	}); 
	

	// loading oriented bbox shader 
	shaders.obbShader = null;	
	shader._loadFiles([basepath + 'shaders/obb.vert', basepath + 'shaders/grid.frag'], function (shaderText) {
		var vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, shaderText[0]);
		gl.compileShader(vertexShader);
		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(vertexShader));
			
		}


		var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragmentShader, shaderText[1]);
		gl.compileShader(fragmentShader);
		if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(fragmentShader));
			
		}

		var program = gl.createProgram();
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error("Could not initialize obb shader");
		}

		program.vertexPositionAttribute = gl.getAttribLocation(program, "positionIn");
		program.projMatrixUniform = gl.getUniformLocation(program, "projMatrix");
		program.viewMatrixUniform = gl.getUniformLocation(program, "viewMatrix");
		program.positionUniform = gl.getUniformLocation(program, "position");
		program.axisXUniform = gl.getUniformLocation(program, "axisX");
		program.axisYUniform = gl.getUniformLocation(program, "axisY");
		program.axisZUniform = gl.getUniformLocation(program, "axisZ");
		program.scaleUniform = gl.getUniformLocation(program, "scale");
		program.colorUniform = gl.getUniformLocation(program, "color");
		program.bboxMatrixUniform = gl.getUniformLocation(program, "bboxMatrix");
		program.registrationMatrixUniform = gl.getUniformLocation(program, "registrationMatrix");
		shaders.obbShader = program;

		}, function (url) {
		console.error('Failed to download "' + url + '"');
	}); 

	/*
	// load dynamic points shader 
	shaders.dynamicPointcloudShader = null;	
	shader._loadFiles(['shaders/dynamicPoints.vert', 'shaders/dynamicPoints.frag'], function (shaderText) {
		var vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, shaderText[0]);
		gl.compileShader(vertexShader);
		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(vertexShader));
			
		}

		var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragmentShader, shaderText[1]);
		gl.compileShader(fragmentShader);
		if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(fragmentShader));
			
		}


		var program = gl.createProgram();
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS))
			console.error("Could not initialize pointcloud shader");

		program.vertexPositionAttribute = gl.getAttribLocation(program, "positionIn");
		program.vertexColorAttribute = gl.getAttribLocation(program, "colorIn");
		program.projMatrixUniform = gl.getUniformLocation(program, "projMatrix");
		program.viewMatrixUniform = gl.getUniformLocation(program, "viewMatrix");
		program.modelMatrixUniform = gl.getUniformLocation(program, "modelMatrix");
		program.geometryMapUniform = gl.getUniformLocation(program, "geometryMap");
		program.cloudScaleUniform = gl.getUniformLocation(program, "cloudScale");
		program.cloudBiasUniform = gl.getUniformLocation(program, "cloudBias");
		shaders.dynamicPointcloudShader = program;

		}, function (url) {
		console.error('Failed to download "' + url + '"');
	}); 
	*/
};

