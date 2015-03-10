#include "Point.h"
#include "Octree.h"


#include <fstream>
#include <cassert>
#include <iostream>
#include <iomanip>
#include <string>
#include <vector>
#include <sstream>

bool option_centerPoints = true;
size_t option_pointCount = 100000000;
unsigned int option_nodeSize = 50000;
bool option_hasNormals = false;

enum ReadMode
{
	RM_PHOTOSCAN,
	RM_SCENE
}	option_readMode = RM_PHOTOSCAN;


static std::vector<std::string> &split(const std::string &s, char delim, std::vector<std::string> &elems) 
{
	std::stringstream ss(s);
	std::string item;
	while (std::getline(ss, item, delim)) {
		elems.push_back(item);
	}
	return elems;
}

static void testForNormals(const char* filename)
{
	std::ifstream file(filename);
	assert(file.is_open());

	std::string buffer;
	std::getline(file, buffer);

	// tokenize buffer, count tokens
	std::vector<std::string> tokens;
	split(buffer, ' ', tokens);

	if (tokens.size() == 6)
		option_hasNormals = false;
	else
		option_hasNormals = true;

	std::cout << "[Normals] " << (option_hasNormals?"N":"No n") << "ormals present; per line token count: " << tokens.size() << std::endl;
	
}

static Pointcloud loadXyz(const char* filename)
{
	std::ifstream file(filename);
	assert(file.is_open());

	std::cout << "[File] Parsing file \"" << filename << "\":\n000M ";
	Pointcloud points;

	points.reserve(5000000);
	
	while (!file.eof())
	{
		Point p;
		file >> p.x >> p.y >> p.z;
		int r, g, b;
		file >> r >> g >> b;

		// normals are found in the AGI Photoscan exports
		if (option_hasNormals)
		{
			// normal and intensity -- ignore for now
			Point n;
			file >> n.x >> n.y >> n.z;
			int i;
			file >> i;
		}

		p.r = r;
		p.g = g;
		p.b = b;

		points.push_back(p);

		if (points.size() % 20000 == 0)
			std::cout << ".";

		if (points.size() % 1000000 == 0)
			std::cout << "\n" << std::setw(3) << std::setfill('0') << (unsigned int)points.size() / 1000000 << "M ";
	}

	std::cout << "done.\nRead " << points.size() << " points.\n";

	return points;
}


static Pointcloud loadBlob(const char* filename)
{
	std::cout << "[File] Reading blob file \"" << filename << "\" ... ";


	std::ifstream file(filename, std::ios::binary | std::ios::ate);
	assert(file.is_open());
	
	std::streampos end = file.tellg();
	file.seekg(0, std::ifstream::beg);
	std::streampos beg = file.tellg();

	// size: 4 floats per point
		
	Pointcloud pc((end - beg) / sizeof(Point));
	file.read(reinterpret_cast<char*>(&pc[0]), end - beg);
	
	std::cout << "File size: " << end - beg << ", " << pc.size() << " points." << std::endl;

	return pc;
}

static void resamplePoints(Pointcloud& points)
{

	if (points.size() > option_pointCount)
	{
		unsigned int step = (unsigned int)((float)points.size() / option_pointCount);
		
		if (step == 1)
			return;
		
		std::cout << "[Points] Resampling pointcloud with step " << step << " ... ";

		Pointcloud temp(points);
		points.clear();

		for (size_t i = 0; i < temp.size(); i += step)
			points.push_back(temp[i]);

		std::cout << "done.\n";
	}

}


static void centerPoints(Pointcloud& points) 
{
	std::cout << "[Points] Centering points ... ";

	AABB bbox;
	bbox.reset();

	for (size_t i = 0; i < points.size(); ++i)
		bbox.extend(points[i]);

	const glm::vec3 center = bbox.getCentroid();

	for (size_t i = 0; i < points.size(); ++i)
	{
		points[i].x -= center.x;
		points[i].y -= center.y;
		points[i].z -= center.z;
	}

	std::cout << "done.\n";
}

static void flipY(Pointcloud& points)
{
	for (size_t i = 0; i < points.size(); ++i)
		points[i].y *= -1;
}

// to convert scene's left-handed coordinate system to opengl
static void flipYZ(Pointcloud& points)
{
	for (size_t i = 0; i < points.size(); ++i)
	{
		float t = points[i].y;
		points[i].y = points[i].z;
		points[i].z = -t;
	}
}


static const char *get_filename_ext(const char *filename) 
{
	const char *dot = strrchr(filename, '.');
	if (!dot || dot == filename) return "";
	return dot + 1;
}

static void parseOptions(int argc, const char** argv)
{
	for (int i = 0; i < argc; ++i)
	{
		if (strcmp(argv[i], "-agi") == 0)
		{
			option_readMode = RM_PHOTOSCAN;
			std::cout << "[Option] Readmode: AGI Photoscan\n";
		}

		if (strcmp(argv[i], "-scene") == 0)
		{
			option_readMode = RM_SCENE;
			std::cout << "[Option] Readmode: SCENE\n";
		}

		if (strcmp(argv[i], "-maxpoints") == 0)
		{
			option_pointCount = atoi(argv[++i]);
			std::cout << "[Option] Subsampling to " << option_pointCount << " points.\n";
		}
		if (strcmp(argv[i], "-nodesize") == 0)
		{
			option_nodeSize = atoi(argv[++i]);
			std::cout << "[Option] Max node size: " << option_nodeSize << std::endl;
		}

	}
}

int main(int argc, const char** argv)
{
	if (argc == 1)
	{
		std::cerr << "Usage " << argv[0] << " <filename> [-agi (default) -scene] [-maxpoints <N> -nodesize <N> ]\n";
		std::cerr << "Note: drag'n'drop works in windows.\n";
		return 2;
	}

	if (argc > 2)
		parseOptions(argc, argv);

	
	Pointcloud points;
	const char* ext = get_filename_ext(argv[1]);

	if (strcmp(ext, "blob") == 0)
		points = loadBlob(argv[1]);
	else
	{
		testForNormals(argv[1]);
		points = loadXyz(argv[1]);

	}
	assert(!points.empty());


	if (option_pointCount > points.size())
		resamplePoints(points);




	if (option_readMode == RM_PHOTOSCAN)
		flipY(points);
	else if (option_readMode == RM_SCENE)
		flipYZ(points);


	if (option_centerPoints)
		centerPoints(points);
	
	SplitConfig config;
	config.minNodeSize = 100;
	config.maxNodeSize = option_nodeSize;

	
	std::string basename(argv[1]);
	basename = basename.substr(0, basename.find_last_of("."));
	basename = basename.substr(basename.find_last_of("/")+1);

	Octree* tree = new Octree(points, nullptr);
	
	tree->build(config, basename);

	system("pause");

	return 0;
}