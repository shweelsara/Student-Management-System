const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const { MongoClient } = require("mongodb");

const PORT = 3000;

const MONGO_URL = "mongodb://127.0.0.1:27017";
const DB_NAME = "student_management";
const COLLECTION_NAME = "students";

const client = new MongoClient(MONGO_URL);

let studentsCollection;

// Send JSON response
function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    });

    res.end(JSON.stringify(data));
}

// Read request body
function getRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";

        req.on("data", chunk => {
            body += chunk;
        });

        req.on("end", () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (error) {
                reject(error);
            }
        });
    });
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);

    // GET all students
    if (
        req.method === "GET" &&
        parsedUrl.pathname === "/api/students"
    ) {
        try {
            const students = await studentsCollection
                .find({})
                .sort({ id: -1 })
                .toArray();

            return sendJSON(res, 200, students);
        } catch (error) {
            console.error(error);

            return sendJSON(res, 500, {
                message: "Failed to get students."
            });
        }
    }

    // ADD student
    if (
        req.method === "POST" &&
        parsedUrl.pathname === "/api/students"
    ) {
        try {
            const body = await getRequestBody(req);

            if (!body.name || !body.department || !body.email) {
                return sendJSON(res, 400, {
                    message: "Please fill in all fields."
                });
            }

            const newStudent = {
                id: Date.now(),
                name: body.name,
                department: body.department,
                email: body.email
            };

            await studentsCollection.insertOne(newStudent);

            return sendJSON(res, 201, newStudent);
        } catch (error) {
            console.error(error);

            return sendJSON(res, 400, {
                message: "Invalid data."
            });
        }
    }

    // UPDATE student
    if (
        req.method === "PUT" &&
        parsedUrl.pathname.startsWith("/api/students/")
    ) {
        try {
            const id = Number(
                parsedUrl.pathname.split("/").pop()
            );

            const body = await getRequestBody(req);

            if (!body.name || !body.department || !body.email) {
                return sendJSON(res, 400, {
                    message: "Please fill in all fields."
                });
            }

            const result = await studentsCollection.updateOne(
                { id: id },
                {
                    $set: {
                        name: body.name,
                        department: body.department,
                        email: body.email
                    }
                }
            );

            if (result.matchedCount === 0) {
                return sendJSON(res, 404, {
                    message: "Student not found."
                });
            }

            const updatedStudent =
                await studentsCollection.findOne({ id: id });

            return sendJSON(res, 200, updatedStudent);
        } catch (error) {
            console.error(error);

            return sendJSON(res, 400, {
                message: "Invalid data."
            });
        }
    }

    // DELETE student
    if (
        req.method === "DELETE" &&
        parsedUrl.pathname.startsWith("/api/students/")
    ) {
        try {
            const id = Number(
                parsedUrl.pathname.split("/").pop()
            );
            const result = await studentsCollection.deleteOne({
                id: id
            });

            if (result.deletedCount === 0) {
                return sendJSON(res, 404, {
                    message: "Student not found."
                });
            }

            return sendJSON(res, 200, {
                message: "Student deleted successfully."
            });
        } catch (error) {
            console.error(error);

            return sendJSON(res, 500, {
                message: "Failed to delete student."
            });
        }
    }

    // Open index.html
    if (
        req.method === "GET" &&
        parsedUrl.pathname === "/"
    ) {
        const filePath = path.join(__dirname, "index.html");

        fs.readFile(filePath, (error, content) => {
            if (error) {
                res.writeHead(500, {
                    "Content-Type": "text/plain"
                });

                return res.end(
                    "Error loading index.html"
                );
            }

            res.writeHead(200, {
                "Content-Type": "text/html"
            });

            res.end(content);
        });

        return;
    }

    // Route not found
    res.writeHead(404, {
        "Content-Type": "application/json"
    });

    res.end(
        JSON.stringify({
            message: "Route not found."
        })
    );
});

// Connect to MongoDB and start server
async function startServer() {
    try {
        await client.connect();

        const database = client.db(DB_NAME);
        studentsCollection = database.collection(
            COLLECTION_NAME
        );

        console.log("Connected to MongoDB successfully.");
        console.log("Server running at http://localhost:" + PORT);

        server.listen(PORT);
    } catch (error) {
        console.error("MongoDB connection failed:");
        console.error(error);
    }
}

startServer();