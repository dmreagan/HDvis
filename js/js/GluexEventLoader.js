THREE.GluexEventLoader = function () {
    this.EventData = null;
};

THREE.GluexEventLoader.prototype = {

    constructor: THREE.GluexEventLoader,

    group: new THREE.Group(name="GluexEvent"),
    defines: {},
    geometries: {},
    refs: {},
    meshes: [],
    geometry:null,

    setGeometry: function (geometry) {
        this.geometry = geometry;
    },

    load: function (url, onLoad, onProgress, onError) {

        this.group.name="GluexEvent";
        var scope = this;

        var loader = new THREE.FileLoader();//XHRLoader();
        loader.setPath(this.path);
        loader.load(url, function (text) {
            onLoad(scope.parse(text));
        }, onProgress, onError);
    },

    /** Function that works with loaded json */
    parse: function (text) {
        this.EventData = JSON.parse(text);

        var scope = this;
        scene.name="Hall";
        // Iterate charged_tracks
        this.EventData.charged_tracks.forEach(function (track) {

            var geometry = new THREE.Geometry();
            geometry.name = "track_" + track.id ;//+"_" + track.charge;

            var track_charge = track.charge;

            track.points.forEach(function (point) {
                var vertex = new THREE.Vector3();
                vertex.x = point[0];
                vertex.y = point[1];
                vertex.z = point[2];

                //setRGB(track_color.r,track_color.g,track_color.b);
                geometry.vertices.push( vertex );
                });

            if(track_charge == "1") {
                var material = new THREE.PointsMaterial({
                    color: 0xff0000,
                    size: 4,
                    opacity: .6,
                    //blending: THREE.AdditiveBlending,
                    transparent: true,
                    sizeAttenuation: false
                })
                var trackMesh = new THREE.Points(geometry, material);
            }//console.log(track_charge);
            else if(track_charge == "-1") {
                var material = new THREE.PointsMaterial({
                    color: 0x00ff00,
                    size: 4,
                    opacity: .6,
                    //blending: THREE.AdditiveBlending,
                    transparent: true,
                    sizeAttenuation: false
                })
                var trackMesh= new THREE.Points( geometry, material );
            }

            trackMesh.userData={charge:track_charge, momentum:track.momentum, TrackChiSq_NDF:track.TrackChiSq_NDF};
            trackMesh.name = geometry.name;
            scope.group.add(trackMesh);

            var linematerial = new THREE.LineBasicMaterial( { color: material.color, linewidth: 2 } );
            var lineBufferGeo=new THREE.BufferGeometry().fromGeometry( geometry );
            var positions = new Float32Array( 1000 * 3 ); // 3 vertices per point
            lineBufferGeo.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
            var trackLineMesh=new THREE.Line(lineBufferGeo,linematerial);
            trackLineMesh.name="trackline_"+geometry.name;
            trackMesh.add(trackLineMesh);
            //console.log(track.charge);
        });
        //iterate neutral tracks
        this.EventData.neutral_tracks.forEach(function (track) {

            var geometry = new THREE.Geometry();
            geometry.name = "track_" + track.id;// +"_"; + track.charge;

            track.points.forEach(function (point) {
                var vertex = new THREE.Vector3();
                vertex.x = point[0];
                vertex.y = point[1];
                vertex.z = point[2];

                //setRGB(track_color.r,track_color.g,track_color.b);

                geometry.vertices.push( vertex );
            });

            var material = new THREE.PointsMaterial( {
                color: 0xffff00,
                size: 4,
                opacity:.6,
                //blending: THREE.AdditiveBlending,
                transparent: true,
                sizeAttenuation: false
            });


            var trackMesh= new THREE.Points( geometry , material );
            //scope.materials.neuTrack["color"]=0x0000ff;
            //console.log(track_charge);
            trackMesh.userData={charge:0, momentum:track.momentum, TrackChiSq_NDF:track.TrackChiSq_NDF};
            trackMesh.name = geometry.name;
            scope.group.add(trackMesh);

            var linematerial = new THREE.LineBasicMaterial( { color: material.color, linewidth: 2 } );
            var lineBufferGeo=new THREE.BufferGeometry().fromGeometry( geometry );
            var positions = new Float32Array( 1000 * 3 ); // 3 vertices per point
            lineBufferGeo.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
            var trackLineMesh=new THREE.Line(lineBufferGeo,linematerial);
            trackLineMesh.name="trackline_"+geometry.name;
            trackMesh.add(trackLineMesh);
            //console.log(track.charge);
        });

        var FCAL_EScale=ViewerConfig.FCAL_EScale;
        this.EventData.FCAL_hits.forEach(function (hit) {
            //console.log(hit.id);
            var geometry = new THREE.Geometry();
            geometry.name = "FCALHit_" + hit.id;

            var box=new THREE.BoxGeometry(2,2,hit.E*FCAL_EScale);
            var material = new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:.7});

            var redness=Math.abs(hit.t)*(6);
            if (redness < 255.) {
                //console.log("in if");
                redness = Math.abs(hit.t) * (6);
            }
            else
            {
                redness=255;
            }
            redness=redness/255;
            //console.log(redness);
            if (hit.t >= 0.0) {
                material.color.r = redness;
                material.color.g = 0;
                material.color.b = 0;
            }
            else {
                material.color.r = 0;
                material.color.g = redness;
                material.color.b = 0;
            }

            var boxmesh= new THREE.Mesh(box,material);
            boxmesh.position.x=hit.x;
            boxmesh.position.y=hit.y;
            boxmesh.position.z=(655+(FCAL_EScale/2)*hit.E);//660

            boxmesh.userData={E:hit.E,column:hit.column,row:hit.row,x:hit.x,y:hit.y,intOverPeak:hit.intOverPeak,t:hit.t};
            //userDataList=Object.keys(boxmesh.userData);
            //console.log(userDataList.length);
            //scene.add(boxmesh);
            //console.log(userDataList[0]);
            //console.log(boxmesh.userData[userDataList[0]]);

            boxmesh.name = geometry.name;
            scope.group.add(boxmesh);
            //console.log(track.charge);
        });

        this.EventData.FCAL_showers.forEach(function (shower) {
            //console.log(hit.id);
            var geometry = new THREE.Geometry();
            geometry.name = "FCALShower_" + shower.id;


            var cone=new THREE.ConeGeometry(10,20,60,60,0,0,2*Math.PI);
            cone.userData="hi";
            var material = new THREE.MeshBasicMaterial({color:0xffff00, transparent:false, opacity:.4});
            material.side = THREE.DoubleSide;

            var conemesh= new THREE.Mesh(cone,material);
            conemesh.position.x=shower.x;
            conemesh.position.y=shower.y;
            conemesh.position.z=shower.z+20;//+30;//+40 May not be needed.....
            conemesh.rotation.x = -1*Math.PI/2;

            conemesh.name = geometry.name;
            scope.group.add(conemesh);
            //console.log(track.charge);
        });

        this.EventData.TOF_points.forEach(function (point) {
            //console.log(hit.id);
            var geometry = new THREE.Geometry();
            geometry.name = "TOFPoint_" + point.id;

            var material = new THREE.MeshBasicMaterial({color:0x0000ff, transparent:true, opacity:.8});
            var tofpoint=new THREE.SphereGeometry(2,32,32,0,6.3,0,6.3);

            var pointmesh= new THREE.Mesh(tofpoint,material);
            pointmesh.position.x=point.x;
            pointmesh.position.y=point.y;
            pointmesh.position.z=point.z;//+40 May not be needed.....

            //scene.add(pointmesh);

            //setRGB(track_color.r,track_color.g,track_color.b);
            //console.log(track_charge);

            pointmesh.name = geometry.name;
            scope.group.add(pointmesh);
            //console.log(track.charge);
        });


       var tofMesh = scope.geometry.getObjectByName("FTOF");

       var TOFReferenceColor= tofMesh.getObjectByName("TOF_p1_m1",true).material.color;
        var TOFOneHitColor = new THREE.Color;
        TOFOneHitColor.setRGB(1,1,0);
        var TOFTwoHitColor = new THREE.Color;
        TOFTwoHitColor.setRGB(1,.66,0);
        var TOFThreeHitColor = new THREE.Color;
        TOFThreeHitColor.setRGB(1,0,0);

        this.EventData.TOF_hits.forEach(function (hit) {
            //get the object to change and change it
            //console.log("hit id:"+hit.id);
            var plane=hit.plane;
            var bar=hit.bar;
            var end = hit.end;

            var block="FTOB";

            var geoName="TOF_p" + plane + "_m"+(bar-1);

            if((bar-1===21 || bar-1===22) && end===0)
            {
                geoName+="_r";
            }

            var object = tofMesh.getObjectByName(geoName,true);
            //getObjectByName( "TestBox", true );


            if(object)
            {
                if(object.geometry.type==="BufferGeometry") {
                    object.geometry = new THREE.Geometry().fromBufferGeometry(object.geometry);
                }

                var glowMesh = new THREEx.GeometricGlowMesh(object);
                //object.add(glowMesh.object3d);


                object.material.vertexColors=THREE.VertexColors;

                var numhits=0;

                if(end===0)
                {
                    //console.log(object.userData.end0h);
                    object.userData.end0h++;
                    //console.log(object.userData.end0h);
                    numhits=object.userData.end0h;
                }
                else if(end===1)
                {
                    //console.log(object.userData.end1h);
                    object.userData.end1h++;
                    //console.log(object.userData.end1h);
                    numhits=object.userData.end1h;
                }

                color = new THREE.Color( 0xffffff );

                if(numhits===1)
                {
                    //console.log("first hit");
                    color=TOFOneHitColor;
                }
                else if(numhits===2)
                {
                    //console.log("second hit");
                    color=TOFTwoHitColor;
                }
                else if(numhits===3)
                {
                    //console.log("second hit");
                    color=TOFThreeHitColor;
                }
                else
                {
                 //   console.log("more hit");
                    color.setRGB(1,0,0);
                }

               /* var inside=glowMesh.insideMesh.material.uniforms;
                inside.glowColor.value.setRGB(color.r,color.g,color.b);
                inside.power.value=.5;
                var outside=glowMesh.insideMesh.material.uniforms;

                outside.glowColor.value.setRGB(color.r,color.g,color.b);
                outside.power.value=.5;
                console.log(end+":"+object.userData.end0h+","+object.userData.end1h );*/

                var face_sent1=-1;
                var face_sent2=-1;

                if(end===1) {
                    face_sent1 = 2;
                    face_sent2 = 3;
                }else
                {

                    face_sent1 = 0;
                    //face_sent2 = 0;
                }

                var half_length=false;

                if(bar - 1 === 21 || bar - 1 === 22)
                    half_length=true;

                for ( var i = 0; i < object.geometry.faces.length; i ++ ) {


                    if((i===face_sent1 || i===face_sent2) && !half_length) {
                        for (var vjs = 0; vjs < 3; vjs++) {

                            if (vjs !== 3) {
                                //var sidecolor = new THREE.Color(0x00ff00);
                                object.geometry.faces[i].vertexColors[vjs] = color;//sidecolor;
                            }
                        }

                    }
                    else {
                        var sent = 0;
                        if (end === 1)
                            sent = 1;

                        if (i % 2 === sent || half_length) {
                            for (var vj = 0; vj < 3; vj++) {

                                if (vj !== 3) {
                                    object.geometry.faces[i].vertexColors[vj] = color;
                                }
                            }

                        }
                    }
                }
                object.geometry.colorsNeedUpdate = true;

                /*if(object.material.color === TOFReferenceColor)
                {
                    object.material.color.setRGB(1,1,0);
                }
               else
               {
                   object.material.color.setRGB(1,object.material.color.g-1./2.,0);

               }*/
            }
            else {
                console.log("DIDN'T FIND " + geoName);
            }//console.log(object);



            //console.log(object.geometry.faces.length);

            /*(var rcol=Math.random();
            var gcol=Math.random();
            var bcol=Math.random();

            for ( var i = 0; i < object.geometry.faces.length; i ++ ) {
                if(i%2==0) {
                    rcol=Math.random();
                    gcol=Math.random();
                    bcol=Math.random();
                }
                object.geometry.faces[ i ].color.setRGB( rcol,gcol,bcol );
            }
            object.geometry.colorsNeedUpdate = true*/

        });
        return this.group;
    },



};
