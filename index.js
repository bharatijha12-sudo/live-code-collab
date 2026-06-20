const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const multer = require("multer");
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Global multiplayer storage registries
let roomPasswords = {};
let roomUsers = {};
let roomEditors = {};
let roomOwners = {};
let roomLanguages = {};
let roomExecutionState = {};
let roomCodes = {};
let roomMessages = {};
let roomFiles = {};
const MAX_MESSAGES_PER_ROOM = 200;
const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(
            null,
            Date.now() + "-" + file.originalname
        );
    }
});

const upload = multer({
    storage
});
const roomsFile = path.join(__dirname, "rooms.json");

if (fs.existsSync(roomsFile)) {

    const savedRooms =
        JSON.parse(
            fs.readFileSync(
                roomsFile,
                "utf8"
            )
        );

    roomPasswords =
        savedRooms.roomPasswords || {};

    roomOwners =
        savedRooms.roomOwners || {};
        roomCodes = savedRooms.roomCodes || {};
        roomMessages = savedRooms.roomMessages || {};
        roomLanguages = savedRooms.roomLanguages || {};
        roomFiles =
savedRooms.roomFiles || {};
}
function saveRoomData() {

    fs.writeFileSync(
        roomsFile,

        JSON.stringify(
            {
                roomPasswords,
                roomOwners,
                roomCodes,
                roomMessages,
                roomLanguages, 
                 roomFiles
            },
            null,
            2
        )
    );
}

app.use(express.static(path.join(__dirname, 'public')));
app.get(
    "/room/:roomName",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "index.html"
            )
        );

    }
);
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Main Real-Time Communication Engine
app.use(
    "/uploads",
    express.static(uploadsDir)
);
app.post(
    "/upload",
    upload.single("file"),
    (req, res) => {

        if (!req.file) {
            return res
                .status(400)
                .json({
                    success: false
                });
        }

        res.json({
            success: true,
            fileName: req.file.filename,
            url:
                "/uploads/" +
                req.file.filename
        });
    }
);
io.on("connection", (socket) => {
    socket.on(
    "send_file",
    (data) => {

        const room =
            data.roomID;

        if (!roomMessages[room]) {
            roomMessages[room] = [];
        }

        roomMessages[room].push({
            username:
                data.username,
            fileUrl:
                data.fileUrl,
            fileName:
                data.fileName
        });
if (
    roomMessages[room].length >
    MAX_MESSAGES_PER_ROOM
) {
    roomMessages[room].shift();
}
        saveRoomData();

        io.to(room).emit(
            "receive_file",
            data
        );
    }
);
    console.log(`User connected: ${socket.id}`);

    // 1. Listen for room passwords and access control
   socket.on("verify_room_password", (data) => {
        const { roomID, password, mode, username } = data;

        // If action is CREATE
        if (mode === "create") {
            if (roomPasswords[roomID]) {
                socket.emit("room_auth_result", {
                    success: false,
                    message: "⚠️ This room name is already taken! Please choose another name or use Join Room."
                });
                return;
            }
            roomPasswords[roomID] = password;
            roomOwners[roomID] = username;
            saveRoomData();
            console.log("Created Room:", roomID);
console.log("Owner:", username);
            socket.emit("room_auth_result", { success: true, roomID: roomID });
            return;
        }

        // If action is JOIN
        if (mode === "join") {
            if (!roomPasswords[roomID]) {
                socket.emit("room_auth_result", {
                    success: false,
                    message: "❌ Room not found! Please check the name or ask your friend to create it first."
                });
                return;
            }
            if (roomPasswords[roomID] !== password) {
                socket.emit("room_auth_result", {
                    success: false,
                    message: "⛔ Incorrect Password Code! Please try again."
                });
                return;
            }
            socket.emit("room_auth_result", { success: true, roomID: roomID });
            return;
        }
    });

    // 2. Handle room joins
    socket.on("join_room", (roomID) => {

    socket.join(roomID);

    socket.emit(
        "restore_code",
        roomCodes[roomID] || ""
    );

    socket.emit(
        "restore_language",
        roomLanguages[roomID] || "javascript"
    );

    socket.emit(
        "restore_messages",
        roomMessages[roomID] || []
    );
socket.emit(
    "restore_files",
    roomFiles[roomID] || {
        "Untitled":""
    }
);
});
socket.on(
    "sync_workspace_files",
    (data) => {

        roomFiles[data.room] =
        data.files;

        saveRoomData();

        socket.to(data.room).emit(
            "restore_files",
            data.files
        );
    }
);
    socket.on("leave_room", (roomID) => {

    socket.leave(roomID);

    if(roomUsers[roomID]){

        roomUsers[roomID] =
        roomUsers[roomID].filter(
            user => user !== socket.currentUsername
        );

        io.to(roomID).emit(
            "update_online_users",
            roomUsers[roomID]
        );
    }
});

    // Secure Native Engine Code Compiler Execution
    const { exec, spawn } = require("child_process");
    const fs = require("fs");
    const path = require("path");

    socket.on("code_change", (data) => {

    roomCodes[data.room] = data.code;

    saveRoomData();

    socket.to(data.room).emit(
        "code_change",
        data.code
    );

});

socket.on(
    "language_change",
    (data) => {

        if (
            roomExecutionState[data.room]
        ) {

            socket.emit(
                "language_locked",
                "Program is running."
            );

            return;
        }

        roomLanguages[data.room] =
            data.language;

        saveRoomData();

        io.to(data.room).emit(
            "language_change",
            data.language
        );
    }
);

    // ⚡ INTERACTIVE MULTI-LANGUAGE RUNTIME COMPILER ENGINE (SPAWN ARCHITECTURE)
    // const { spawn } = require("child_process");
    // const fs = require("fs");
    // const path = require("path");

    // Tracks live running processes per user tab session
    let runningActiveProcessesMap = new Map();

   

    // ⌨️ Capture live terminal keyboard input streams from user panel
    socket.on("terminal_input_stream", (data) => {
        const activeProc = runningActiveProcessesMap.get(socket.id);
        if (activeProc && activeProc.stdin && activeProc.stdin.writable) {
            // Write keyboard buffer straight into the running machine environment
            activeProc.stdin.write(data.input + "\n");
        }
    });
socket.on(
    "sync_terminal_input",
    (data) => {

        socket.to(data.room).emit(
            "sync_terminal_input",
            data.input
        );

    }
);

    socket.on("execute_code_request", (data) => {
        console.log("EXECUTE REQUEST RECEIVED");
    console.log(data);
        const {
    language,
    code,
    stdin,
    room
} = data;
console.log("ROOM =", room);
console.log("CURRENT ROOM =", socket.currentRoom);
console.log("LANGUAGE =", language);
roomExecutionState[room] = true;

io.to(room).emit(
    "execution_started"
);
        const tempDir =
path.join(
    __dirname,
    "temp_sandbox",
    room
);
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, {
        recursive: true
    });
}
        // Kill any abandoned process still running on this tab session
        if (runningActiveProcessesMap.has(socket.id)) {
            try { runningActiveProcessesMap.get(socket.id).kill(); } catch(e){}
            runningActiveProcessesMap.delete(socket.id);
        }

        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }

        let fileName = "";
        let compileCmd = "";
        let compileArgs = [];
        let runCmd = "";
        let runArgs = [];

        switch (language) {
            case "csharp":

    fileName =
        `Program_${socket.id}.cs`;

    compileCmd =
        "csc";

    compileArgs = [
        path.join(
            tempDir,
            fileName
        )
    ];

    runCmd =
        path.join(
            tempDir,
            `Program_${socket.id}.exe`
        );

    break;
    case "go":

    fileName =
        `main_${socket.id}.go`;

    runCmd = "go";

    runArgs = [
        "run",
        path.join(
            tempDir,
            fileName
        )
    ];

    break;
    case "rust":

    fileName =
        `main_${socket.id}.rs`;

    compileCmd =
        "rustc";

    compileArgs = [
        path.join(
            tempDir,
            fileName
        ),
        "-o",
        path.join(
            tempDir,
            `main_${socket.id}.exe`
        )
    ];

    runCmd =
        path.join(
            tempDir,
            `main_${socket.id}.exe`
        );

    break;
case "typescript":

    fileName = `main_${socket.id}.ts`;

    runCmd = "cmd";

    runArgs = [
        "/c",
        "npx",
        "tsx",
        path.join(tempDir, fileName)
    ];

    break;
            case "c":

    fileName =
        `main_${socket.id}.c`;

    const cExe =
        `main_${socket.id}.exe`;

    compileCmd = "gcc";

    compileArgs = [
        path.join(tempDir, fileName),
        "-o",
        path.join(tempDir, cExe)
    ];

    runCmd =
        path.join(tempDir, cExe);

    break;
            case "javascript":
                fileName = `script_${socket.id}.js`;
                runCmd = "node";
                runArgs = [path.join(tempDir, fileName)];
                break;
            case "python":
                fileName = `script_${socket.id}.py`;
                runCmd = "python";
                runArgs = ["-u", path.join(tempDir, fileName)]; // '-u' forces unbuffered outputs for instant streaming
                break;
            case "cpp":
                fileName = `main_${socket.id}.cpp`;
                const exeName = `main_${socket.id}.exe`;
                compileCmd = "g++";
                compileArgs = [path.join(tempDir, fileName), "-o", path.join(tempDir, exeName)];
                runCmd = path.join(tempDir, exeName);
                break;
           case "java":

    const javaTempDir =
        path.join(tempDir, `java_${socket.id}`);

    if (!fs.existsSync(javaTempDir)) {
        fs.mkdirSync(javaTempDir);
    }

    const publicClass =
        code.match(
            /public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/
        );

    const normalClass =
        code.match(
            /class\s+([A-Za-z_][A-Za-z0-9_]*)/
        );

const className =
    (publicClass && publicClass[1]) ||
    (normalClass && normalClass[1]) ||
    "Main";

    fileName =
        path.join(
            `java_${socket.id}`,
            `${className}.java`
        );

    compileCmd = "javac";

    compileArgs = [
        path.join(tempDir, fileName)
    ];

    runCmd = "java";

    runArgs = [
        "-cp",
        javaTempDir,
        className
    ];

    break;
            default:
io.to(room).emit(
    "execute_code_response", { stderr: "❌ System Error: Unsupported runtime language selected." });
                return;
        }

        const filePath = path.join(tempDir, fileName);
        fs.writeFile(filePath, code, (err) => {
            if (err) {
                return io.to(room).emit(
    "execute_code_response", { stderr: `❌ File system write error: ${err.message}` });
            }

            // Internal controller helper to spawn and monitor the live app thread
            function startRuntimeExecutionStream() {
                console.log("RUN CMD:", runCmd);
console.log("RUN ARGS:", runArgs);
                const childProcessInstance = spawn(runCmd, runArgs);
                childProcessInstance.on("error", (err) => {
    console.log("SPAWN ERROR:", err);
});
                if (
    stdin &&
    childProcessInstance.stdin
) {

    childProcessInstance.stdin.write(
        stdin + "\n"
    );

    childProcessInstance.stdin.end();

}
                runningActiveProcessesMap.set(socket.id, childProcessInstance);

                // Stream real-time stdout text chunks back to terminal console as they happen
                childProcessInstance.stdout.on("data", (chunk) => {

    console.log(
        "TS STDOUT:",
        chunk.toString()
    );

    io.to(room).emit(
        "execute_code_response",
        {
            output: chunk.toString()
        }
    );

});

                // Stream real-time standard error chunks
                childProcessInstance.stderr.on("data", (chunk) => {
io.to(room).emit(
    "execute_code_response", { stderr: chunk.toString() });
                });

                // Cleanup garbage paths immediately upon process shutdown closure
                childProcessInstance.on("close", (codeCode) => {

    roomExecutionState[room] = false;

    io.to(room).emit(
        "execution_finished"
    );

   


                    runningActiveProcessesMap.delete(socket.id);
                    try {
                        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                        if (language === "cpp" && fs.existsSync(path.join(tempDir, `main_${socket.id}.exe`))) {
                            fs.unlinkSync(path.join(tempDir, `main_${socket.id}.exe`));
                        }
                    } catch (cleanupErr) {}
                   io.to(room).emit(
    "execute_code_response", { systemNotice: `\n💡 Process finished with exit code ${codeCode}` });
                });

                // Enforce an absolute 15-second process timeout guard against infinite loop freezes
                setTimeout(() => {
                    console.log("TIMEOUT FIRED");
                    if (runningActiveProcessesMap.has(socket.id)) {
                        try { childProcessInstance.kill(); } catch(e){}
io.to(room).emit(
    "execute_code_response", { stderr: "\n❌ Execution Timeout Error: Process terminated after 15 seconds." });
                    }
                }, 15000);
            }

            // Compile validation checker step for C++ and Java languages
            if (compileCmd) {
                const compilationTask = spawn(compileCmd, compileArgs);
                let compileErrorsBuffer = "";

                compilationTask.stderr.on("data", (chunk) => {
                    compileErrorsBuffer += chunk.toString();
                });

                compilationTask.on("close", (exitCode) => {

    console.log("COMPILER EXIT CODE =", exitCode);

    if (exitCode !== 0) {

        console.log("COMPILATION FAILED");

        io.to(room).emit(
            "execute_code_response",
            {
                stderr:
                `❌ Compilation Error:\n${compileErrorsBuffer}`
            }
        );

    } else {

        console.log("COMPILATION SUCCESS");
        console.log("RUN CMD =", runCmd);

        startRuntimeExecutionStream();
    }
});
            } else {
                // Interpreted systems (Python/JS) skip compilation phases entirely
                startRuntimeExecutionStream();
            }
        });
    });

    // 4. Handle chat messages
    // 4. Handle chat messages

   socket.on("send_message", (data) => {

    if (!roomMessages[data.room]) {
        roomMessages[data.room] = [];
    }

    roomMessages[data.room].push(data);
    if (
    roomMessages[data.room].length >
    MAX_MESSAGES_PER_ROOM
) {
    roomMessages[data.room].shift();
}

    saveRoomData();

    io.to(data.room).emit(
        "receive_message",
        data
    );

});
socket.on("typing_start", (data) => {

    socket.to(data.room).emit(
        "user_typing",
        {
            username: data.username
        }
    );

});

socket.on("typing_stop", (data) => {

    socket.to(data.room).emit(
        "user_stop_typing"
    );

});
socket.on(
    "cursor_move",
    (data) => {

        socket.to(data.room).emit(
            "cursor_update",
            {
                username: data.username,
                line: data.line,
                column: data.column
            }
        );

    }
);
    // 5. Handle voice notes
    socket.on("voice_message", (data) => {
        io.to(data.room).emit("incoming_voice_message", data);
    });

    // 6. Tracks when a user fully authenticates and joins a room presence
   socket.on("user_online_presence", (data) => {

const {
room,
username,
avatar
} = data;

socket.currentRoom = room;

socket.currentUsername = username;

if(!roomUsers[room]){
roomUsers[room] = [];
}

const existing =
roomUsers[room].find(
u => u.username === username
);

if(!existing){

roomUsers[room].push({
username,
avatar
});

}

io.to(room).emit(
"update_online_users",
roomUsers[room]
);

});
socket.on(
"editing_status",
(data) => {

const {
room,
username,
file
} = data;

if(!roomEditors[room]){
roomEditors[room] = [];
}

const existing =
roomEditors[room].find(
u => u.username === username
);

if(existing){

existing.file = file;

}else{

roomEditors[room].push({
username,
file
});

}

io.to(room).emit(
"active_editors_update",
roomEditors[room]
);

});
socket.on(
"avatar_changed",
(data) => {

const {
room,
username,
avatar
} = data;

if(!roomUsers[room]) return;

roomUsers[room] =
roomUsers[room].map(user => {

if(user.username === username){

return {
...user,
avatar
};

}

return user;

});

io.to(room).emit(
"update_online_users",
roomUsers[room]
);

});
socket.on("delete_room", (data) => {

    const roomID = data.roomID;
    const username = data.username;
    console.log("ROOM OWNER =", roomOwners[roomID]);
console.log("CURRENT USER =", socket.currentUsername);
    console.log(
"Owner:",
roomOwners[roomID]
);

console.log(
"User:",
socket.currentUsername
);

    if (!roomOwners[roomID]) {
        return;
    }

    if (roomOwners[roomID] !== username) {

        socket.emit(
            "room_delete_failed",
            "Only room creator can delete this room."
        );

        return;
    }
io.to(roomID).emit("room_deleted");
io.in(roomID).socketsLeave(roomID);
    delete roomPasswords[roomID];
    delete roomOwners[roomID];
    delete roomUsers[roomID];
delete roomLanguages[roomID];
delete roomExecutionState[roomID];
delete roomCodes[roomID];
delete roomMessages[roomID];
saveRoomData();
    
});
    // 7. Clean up when a user closes their tab or disconnects
    socket.on("disconnect", () => {
        const room = socket.currentRoom;
        const name = socket.currentUsername;

        if (room && roomUsers[room]) {
            roomUsers[room] = roomUsers[room].filter(user => user !== name);
            io.to(room).emit("update_online_users", roomUsers[room]);
        }
        console.log(`User disconnected: ${socket.id}`);
    });
});

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Socket.IO server running on port ${PORT}`);
});