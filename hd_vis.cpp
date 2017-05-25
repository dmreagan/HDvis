#include <thread>

#include <TFile.h>
#include <TApplication.h>

#include <TSystem.h>
#include <TEveCalo.h>
#include <TEveWindow.h>
#include <TEveManager.h>
#include <TEveBrowser.h>
#include <TEveScene.h>
#include <TEveViewer.h>
#include <TGeoManager.h>
#include <TEveGedEditor.h>
#include <TGTab.h>
#include "EventReader/JEventProcessor_EventReader.h"
#include "DANA/DApplication.h"
#include <TEveGeoNode.h>
#include <mutex>


using namespace std;

TGeoManager * hddsroot();
//TGeoManager * getGeom();

typedef void SetTFilePtrAddress_t(TFile **);
TFile* tfilePtr = NULL;
string OUTPUT_FILENAME = "hd_root.root";
string COMMAND_LINE_OUTPUT_FILENAME = "";
bool filename_from_command_line = false;

void ParseCommandLineArguments(int &narg, char *argv[]);
void DecideOutputFilename(void);
void Usage(void);

TApplication *gApp;


std::mutex gEventMutex;     /// Mutex between ROOT graphical thread and EvenRead function

void RunRootApp()
{
    // Here is what happens in gApp->Run();
    // 3 root functions should be called in this order:
    // gApplication->StartIdleing() -> gSystem->InnerLoop() -> gApplication->StartIdleing()
    // In this function we want to pause ROOT graphical thread, run EventRead, continue ROOT graph. thread
    // In order to do it we use gEventMutex

    gApplication->StartIdleing();

    while (1) {

        while(!gEventMutex.try_lock()) std::this_thread::yield();

            std::lock_guard<std::mutex> eventMutexLockGuard(gEventMutex, std::adopt_lock);

            gSystem->InnerLoop();
            gApplication->StopIdleing();
            gApplication->StartIdleing();

    }
}


//-----------
// main
//-----------
int main(int narg, char *argv[])
{
	// Parse the command line
	ParseCommandLineArguments(narg, argv);

	// Create ROOT application 
	// Instantiate an event loop object
	DApplication app(narg, argv);

	gApp = new TApplication("Hahaha it works!", &narg, argv);

    new TGeoManager("GLUEX", "GlueX Geometry");

    auto geometry = hddsroot();
    gGeoManager->DefaultColors();

    TEveManager::Create();

    TGeoNode* hallNode = (TGeoNode *) gGeoManager->GetTopVolume()->FindNode("HALL_1");
    cout<<"hallNode is "<<hallNode<<endl;
    cout<<hallNode->GetMotherVolume()<<endl;

    TGeoNode* fcalNode = (TGeoNode *) hallNode->GetNodes()->FindObject("FCAL_1");
    cout<<"fcalNode is "<<fcalNode<<endl;

    TGeoNode* tofNode = (TGeoNode *) hallNode->GetNodes()->FindObject("FTOF_1");
    cout<<"tofNode is "<<tofNode<<endl;
    //TGeoTranslation shift(-150,350,500);


    //add independent
    /*TGeoMaterial *matVacuum = new TGeoMaterial("Vacuum", 0,0,0);
    TGeoMedium *Vacuum = new TGeoMedium("Vacuum",1, matVacuum);
    TGeoVolume *top = gGeoManager->MakeBox("TOP", Vacuum, 1000, 1000., 1000.);

    TGeoNode* lassNode = (TGeoNode *) hallNode->GetNodes()->FindObject("LASS");*/
    //cout<<"lass node: "<<lassNode<<endl;
    //top->AddNode(lassNode->GetMotherVolume(),1,new TGeoTranslation(0,0,-500));

    //top->AddNode(hallNode->GetMotherVolume(),1,new TGeoTranslation(-150.501,349.986,-147.406));
    //hallNode->GetMotherVolume()->AddNode(hallNode->GetMotherVolume(),1,new TGeoTranslation(150,300,500));

    //auto hallTopNode=new TEveGeoTopNode(gGeoManager,top->GetNode("LASS_1"));
    auto hallTopNode=new TEveGeoTopNode(gGeoManager,hallNode);
    //top->AddNode(hallNode->GetMotherVolume(),1,new TGeoTranslation(150,300,500));

    //gEve->AddGlobalElement(hallTopNode);//needs alignment

    gEve->AddGlobalElement(new TEveGeoTopNode(gGeoManager, fcalNode));
    //gEve->AddGlobalElement(new TEveGeoTopNode (gGeoManager, tofNode));

    TEveWindowSlot* slot = 0;
    slot = TEveWindow::CreateWindowInTab(gEve->GetBrowser()->GetTabRight());

    TEveViewer* sv = new TEveViewer("Stereo GL", "Stereoscopic view");
    sv->SpawnGLViewer(gEve->GetEditor(), kTRUE, false);
    sv->AddScene(gEve->GetGlobalScene());

    slot->ReplaceWindow(sv);

    gEve->GetViewers()->AddElement(sv);

    gEve->GetBrowser()->GetTabRight()->SetTab(1);

    // --- Redraw ---



    //RunRootApp();

	// Instantiate our event processor
    auto myproc = new JEventProcessor_EventReader(hallNode);
	myproc->setRootApplication(gApp);
    myproc->setCanvas(gEve->AddCanvasTab("FCAL histogram"));

    gEve->FullRedraw3D(kTRUE);
    gEve->EditElement(sv);

    std::thread t1(RunRootApp);


	// Decide on the output filename
	DecideOutputFilename();
	
	// Run though all events, calling our event processor's methods
	app.monitor_heartbeat = 0;
	app.Run(myproc);
	
	return app.GetExitCode();

}


//-----------
// ParseCommandLineArguments
//-----------
void ParseCommandLineArguments(int &narg, char *argv[])
{
	if(narg==1)Usage();
	
	for(int i=1;i<narg;i++){
		if(argv[i][0] != '-')continue;
		switch(argv[i][1]){
			case 'h':
				Usage();
				break;
			case 'D':
				toprint.push_back(&argv[i][2]);
				break;
			case 'A':
				ACTIVATE_ALL = 1;
			case 'o':
				if(i>=narg-1){
					cerr<<"\"-o\" requires a filename!"<<endl;
					exit(-1);
				}
				COMMAND_LINE_OUTPUT_FILENAME = argv[i+1];
				filename_from_command_line = true;
				
				// Remove the "-o fname" arguments from file list so
				// JANA won't think the "fname" is an input file.
				for(int j=i; j<(narg-2); j++)argv[j] = argv[j+2];
				narg -= 2;
				break;
		}
	}
}

//-----------
// DecideOutputFilename
//-----------
void DecideOutputFilename(void)
{
	/// Decide on the output filename to use based on the command line
	/// input and configuration parameter input. The command line takes
	/// precedence. This also makes sure to copy the filename that is
	/// being used into the configuration parameter.

	// Set the default output filename (avoids later warnings from JANA)
	gPARMS->SetDefaultParameter("OUTPUT_FILENAME", OUTPUT_FILENAME,"Output filename used by hd_root");
	
	// If the user specified an output filename on the command line,
	// use it to overwrite the config. parameter/default one
	if(filename_from_command_line){
		OUTPUT_FILENAME = COMMAND_LINE_OUTPUT_FILENAME;
	
		// Set the actual output filename in config. param.
		gPARMS->SetParameter("OUTPUT_FILENAME", OUTPUT_FILENAME);
	}

	jout<<"OUTPUT_FILENAME: "<<OUTPUT_FILENAME<<endl;

}

//-----------
// Usage
//-----------
void Usage(void)
{
	// Make sure a JApplication object exists so we can call Usage()
	JApplication *app = japp;
	if(app == NULL) app = new DApplication(0, NULL);

	cout<<"Usage:"<<endl;
	cout<<"       hd_root [options] source1 source2 ..."<<endl;
	cout<<endl;
	cout<<"Process events from a Hall-D data source (e.g. a file)"<<endl;
	cout<<"This will create a ROOT file that plugins or debug histos"<<endl;
	cout<<"can write into."<<endl;
	cout<<endl;
	cout<<"Options:"<<endl;
	cout<<endl;
	app->Usage();
	cout<<endl;
	cout<<"   -h        Print this message"<<endl;
	cout<<"   -Dname    Activate factory for data of type \"name\" (can be used multiple times)"<<endl;
	cout<<"   -A        Activate factories (overrides and -DXXX options)"<<endl;
	cout<<"   -o fname  Set output filename (default is \"hd_root.root\")"<<endl;
	cout<<endl;

	exit(0);
}
