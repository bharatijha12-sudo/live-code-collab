const socket = io();
let editor;
let pendingRestoredCode = null;
let isSyncing = false;
window.codeRestored = false;
let activeRoom = "";
const EXECUTION_HISTORY_PREFIX = "workspaceExecutionHistory_";
let username = "";
let connectedRoomsList = []; // Tracks open room channels for switching
let activeModalTab = "create";
let dashboardOpen = false;
let explorerVisible = true;

function toggleExplorerPanel() {

    const explorer =
        document.getElementById("fileExplorer");

    if (!explorerVisible) {

        explorer.style.display = "flex";

        explorerVisible = true;

    } else {

        explorer.style.display = "none";

        explorerVisible = false;
    }
}
const pathParts =
    window.location.pathname
        .split("/");

let roomFromURL = null;

if (
    pathParts.length >= 3 &&
    pathParts[1] === "room"
) {

    roomFromURL =
        decodeURIComponent(
            pathParts[2]
        );

}

// 🎨 CORE PALETTE CONFIGURATIONS
const colorPalettes = {

theme1: {
    name: "☕ Mocha Rebellion",
colors: [
"#4E1414",
"#6D2323",
"#A44B4B",
"#F7E7E3"
],
    isDark: false
},

theme2: {
    name: "🌊 Midnight Lo-Fi",
    colors: [
        "#081A3A",
        "#123A75",
        "#3D8BFF",
        "#A8D5FF"
    ],
    isDark: false
},

theme3: {
    name: "🩰 Strawberry Cloud",
colors: [
"#F7D4E0",
"#F3AFC8",
"#E37AA6",
"#8E4568"
],
    isDark: false
},

theme4: {
    name: "🥃 Dark Roast Society",
    colors: [
"#252525",
"#383838",
"#626262",
"#DADADA"
],
    isDark: true
}
};

let currentThemeKey = "theme2";

// LOCAL MEMORY RETRIEVAL INITIALIZATION ON BOOTUP
window.addEventListener("DOMContentLoaded", () => {
    if (roomFromURL) {

    const roomInput =
        document.getElementById(
            "dashRoomName"
        );

    if (roomInput) {

        roomInput.value =
            roomFromURL;

    }

}
    const savedName = localStorage.getItem("workspaceUsername") || "";
    const savedEmail = localStorage.getItem("workspaceEmail") || "";
    const savedLastRoom = localStorage.getItem("workspaceLastActiveRoom") || "";
    const savedChannelList = localStorage.getItem("workspaceConnectedRoomsList");
    
    if (savedName) {
        document.getElementById("portalUsernameInput").value = savedName;
        document.getElementById("dashboardProfileNameInput").value = savedName;
        username = savedName;
    }
    if (savedEmail) {
        document.getElementById("dashboardEmailInput").value = savedEmail;
    }
    if (savedChannelList) {
        connectedRoomsList = JSON.parse(savedChannelList);
    }

    // WHATSAPP ENTER-KEY KEYBOARD SUBMISSION BINDING
    const msgField = document.getElementById("messageInput");
    let typingTimer;

msgField.addEventListener(
    "input",
    () => {

        if (!activeRoom) return;

        socket.emit(
            "typing_start",
            {
                room: activeRoom,
                username: username
            }
        );

        clearTimeout(
            typingTimer
        );

        typingTimer =
        setTimeout(() => {

            socket.emit(
                "typing_stop",
                {
                    room: activeRoom,
                    username: username
                }
            );

        }, 1200);

    }
);
    if (msgField) {
        msgField.addEventListener("keydown", (event) => {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        });
    }

    // 🚪 AUTO-LOGIN CONTROLLER: Bypasses the portal page and loads your room session directly
    if (savedName && savedLastRoom) {
        if (!connectedRoomsList.includes(savedLastRoom)) {
            connectedRoomsList.push(savedLastRoom);
            localStorage.setItem("workspaceConnectedRoomsList", JSON.stringify(connectedRoomsList));
        }
        activeRoom = savedLastRoom;
    setTimeout(() => {
    loadExecutionHistory();
}, 300);
        
        // Remove the entry curtain immediately
        document.getElementById("welcomeOverlay").style.display = "none";
        
        // Re-authenticate directly with the socket server
       // socket.emit("join_room", activeRoom);
       // socket.emit("user_online_presence", { room: activeRoom, username: username });
        
        // Refresh your dashboard list and active window state
        if (typeof renderActiveChannelsListUI === "function") renderActiveChannelsListUI();
        if (typeof switchActiveWorkspaceChannel === "function") switchActiveWorkspaceChannel(activeRoom);
        socket.emit("join_room", activeRoom);
socket.emit(
    "user_online_presence",
    {
        room: activeRoom,
        username: username
    }
);
    }
});

// PROFILE MUTATION LOCAL STORAGE AUTO-SYNC
// PROFILE MUTATION LOCAL STORAGE AUTO-SYNC
let selectedAvatar =
localStorage.getItem("workspaceAvatar")
|| "😀";

function openAvatarPicker(){
document.getElementById("avatarModal").style.display="flex";
}

function closeAvatarPicker(){
document.getElementById("avatarModal").style.display="none";
}

function selectAvatar(avatar){

selectedAvatar = avatar;

localStorage.setItem(
"workspaceAvatar",
avatar
);
connectedRoomsList.forEach(room => {

socket.emit(
"avatar_changed",
{
room: room,
username: username,
avatar: avatar
}
);

});
const avatarCircle =
document.getElementById(
"profileAvatarCircle"
);

if(avatarCircle){

avatarCircle.innerHTML =
avatar;

}

if(activeRoom){

socket.emit(
"user_online_presence",
{
room: activeRoom,
username: username,
avatar: avatar
}
);

}

}

window.addEventListener(
"DOMContentLoaded",
() => {

const savedAvatar =
localStorage.getItem(
"workspaceAvatar"
);

if(savedAvatar){

selectedAvatar =
savedAvatar;

const avatarCircle =
document.getElementById(
"profileAvatarCircle"
);

if(avatarCircle){

if(
savedAvatar.startsWith("data:image")
){

avatarCircle.innerHTML = `
<img
src="${savedAvatar}"
style="
width:100%;
height:100%;
object-fit:cover;
border-radius:50%;
"
/>
`;

}
else{

avatarCircle.innerHTML =
savedAvatar;

}

}

}

if(savedAvatar){

selectedAvatar = savedAvatar;

const avatarCircle =
document.getElementById(
"profileAvatarCircle"
);

if(avatarCircle){
avatarCircle.innerHTML =
savedAvatar;
}

}

}
);
function saveProfileData() {
    const updatedName = document.getElementById("dashboardProfileNameInput").value.trim();
    const updatedEmail = document.getElementById("dashboardEmailInput").value.trim();
    
    if (updatedName) {
        username = updatedName;
        localStorage.setItem("workspaceUsername", updatedName);
    }
    localStorage.setItem("workspaceEmail", updatedEmail);
}

// Track active channels when logging into rooms
socket.on("room_auth_result", (data) => {
    if (data.success) {
        document.getElementById("welcomeOverlay").style.display = "none";
        
        if (!connectedRoomsList.includes(data.roomID)) {
            connectedRoomsList.push(data.roomID);
        }
        activeRoom = data.roomID;
        setTimeout(() => {
    loadExecutionHistory();
}, 300);
        
        // Save states to local storage immediately upon entering
        localStorage.setItem("workspaceLastActiveRoom", data.roomID);
        localStorage.setItem("workspaceConnectedRoomsList", JSON.stringify(connectedRoomsList));
        
        
       socket.emit(
"user_online_presence",
{
room: activeRoom,
username: username,
avatar:
localStorage.getItem(
"workspaceAvatar"
) || selectedAvatar
}
);
        
        if (typeof renderActiveChannelsListUI === "function")
    renderActiveChannelsListUI();
        switchActiveWorkspaceChannel(data.roomID);
    } else {
        alert(data.message);
    }
});

// 1. CHRONOLOGICAL PORTAL CONTEXT
function nextPortalStep() {
    const userInput = document.getElementById("portalUsernameInput").value.trim();
    if (!userInput) {
        alert("Please set your Display Name identity before continuing!");
        return;
    }
    username = userInput;
    document.getElementById("dashboardProfileNameInput").value = username;
    saveProfileData();

    document.getElementById("portalStep1").style.display = "none";
    document.getElementById("portalStep2").style.display = "block";
}

function togglePortalTab(mode) {
    activeModalTab = mode;
    const createBtn = document.getElementById("tabCreateBtn");
    const joinBtn = document.getElementById("tabJoinBtn");
    const submitBtn = document.getElementById("portalSubmitBtn");

    if (mode === "create") {
        createBtn.style.background = "#4B5694"; createBtn.style.color = "white";
        joinBtn.style.background = "#7288AE"; joinBtn.style.color = "white";
        submitBtn.innerText = "Create New Workspace ✨";
    } else {
        joinBtn.style.background = "#4B5694"; joinBtn.style.color = "white";
        createBtn.style.background = "#7288AE"; createBtn.style.color = "white";
        submitBtn.innerText = "Verify & Enter Room 🚪";
    }
}

function submitPortalForm() {
    const roomInput = document.getElementById("portalRoomInput").value.trim();
    const passInput = document.getElementById("portalPasswordInput").value.trim();

    if (!roomInput || !passInput) {
        alert("Please completely fill out both room fields!");
        return;
    }

    socket.emit("verify_room_password", { 
        roomID: roomInput, 
        password: passInput, 
        mode: activeModalTab,
        username: username
    });
}

// 2. ADAPTIVE CHANNEL EXTENSION MANAGEMENT VIA DASHBOARD
function addNewRoomFromDashboard(mode) {
    const nameInput = document.getElementById("dashRoomName");
    const passInput = document.getElementById("dashRoomPass");
    const targetRoomName = nameInput.value.trim();
    const targetRoomPass = passInput.value.trim();

    if (!targetRoomName || !targetRoomPass) {
        alert("Please specify the room coordinates and key code parameters!");
        return;
    }

    socket.emit("verify_room_password", {
        roomID: targetRoomName,
        password: targetRoomPass,
        mode: mode,
        username: username
    });

    nameInput.value = "";
    passInput.value = "";
}

// DYNAMIC RUNTIME INTER-ROOM TAB HOPPING PIPELINE
function switchActiveWorkspaceChannel(targetRoomID) {
    if (targetRoomID === activeRoom) return;
    activeRoom = targetRoomID;
    clearExecutionPanel();
loadExecutionHistory();
    
   document.getElementById("chatHeaderTitle").innerHTML =
    `💬 Room Workspace: <span style="font-weight:bold;">${activeRoom}</span>`;
    socket.emit("join_room", activeRoom);
    socket.emit(
"user_online_presence",
{
room: activeRoom,
username: username,
avatar:
localStorage.getItem(
"workspaceAvatar"
) || selectedAvatar
}
);
    
    document.getElementById("messages").innerHTML = "";
    renderActiveChannelsListUI();
}

function renderActiveChannelsListUI() {
    const listElement = document.getElementById("multiRoomsActiveTabsList");
    if (!listElement) return;
    listElement.innerHTML = "";

    connectedRoomsList.forEach(roomName => {
        const li = document.createElement("li");
        const isActive = roomName === activeRoom;
        
        li.innerText = `${isActive ? "⭐ " : "🚪 "} ${roomName}`;
        li.style.padding = "10px";
        li.style.borderRadius = "6px";
        li.style.fontSize = "13px";
        li.style.cursor = "pointer";
        li.style.fontWeight = "bold";
        li.style.background = isActive ? "#4B5694" : "rgba(255,255,255,0.6)";
       li.style.color = isActive ? "white" : "#111844";
        li.style.border = isActive ? "none" : "1px solid #7288AE";
        li.style.transition = "all 0.2s ease";

        li.onclick = () => switchActiveWorkspaceChannel(roomName);
        listElement.appendChild(li);
    });
}

// 3. CONTROL PANEL VIEW TOGGLES
function toggleControlDashboard() {
    const dashboard = document.getElementById("slidingDashboard");
    const toggleBtn = document.getElementById("dashboardToggleBtn");
    
    if (!dashboardOpen) {
        dashboard.style.left = "0px";
        toggleBtn.style.left = "315px";
toggleBtn.innerHTML = "✕";
toggleBtn.style.width = "42px";
        dashboardOpen = true;
    } else {
        dashboard.style.left = "-320px";
        toggleBtn.style.left = "15px";
        toggleBtn.innerText = "☰";
        dashboardOpen = false;
    }
}

// 4. EDITOR ENGINE MONACO
window.addEventListener("DOMContentLoaded", () => {
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' }});
    require(['vs/editor/editor.main'], function() {
editor = monaco.editor.create(document.getElementById('editorContainer'), {

   value: '',
language: 'javascript',
theme: 'vs',
automaticLayout: true,
fontSize: 14,

wordWrap: "off",
wordWrapColumn: 999999,

scrollBeyondLastLine: false,
smoothScrolling: true,

scrollbar: {
    horizontal: "visible",
    vertical: "visible",
    horizontalScrollbarSize: 14,
    verticalScrollbarSize: 14,
    alwaysConsumeMouseWheel: false
},

scrollBeyondLastColumn: 200,
minimap: {
    enabled: false
}
});
setTimeout(() => {
    editor.layout();
}, 500);
        if (pendingRestoredCode !== null) {

    isSyncing = true;

    editor.setValue(
        pendingRestoredCode
    );

    isSyncing = false;

    pendingRestoredCode = null;
}

        let syncTimer;

editor.onDidChangeModelContent(() => {
    
if (workspaceFiles[activeFile] !== undefined) {

    workspaceFiles[activeFile] =
    editor.getValue();

    localStorage.setItem(
        "workspaceFiles",
        JSON.stringify(workspaceFiles)
    );

}
    if (isSyncing) return;
if (activeFile) {

    workspaceFiles[activeFile] =
    editor.getValue();

    localStorage.setItem(
        "workspaceFiles",
        JSON.stringify(workspaceFiles)
    );
}
    clearTimeout(syncTimer);

    syncTimer = setTimeout(() => {

        if (activeRoom) {
            

            socket.emit(
                "code_change",
                {
                    room: activeRoom,
                    code: editor.getValue()
                }
            );

        }

    }, 100);

});
editor.onDidChangeCursorPosition(
    (event) => {

        if (!activeRoom) return;

        socket.emit(
            "cursor_move",
            {
                room: activeRoom,
                username: username,
                line: event.position.lineNumber,
                column: event.position.column
            }
        );

    }
);
        applyCustomThemePalette("theme2");
    });
});


function applyCustomThemePalette(themeKey) {
    currentThemeKey = themeKey;
    const target = colorPalettes[themeKey];
    if (!target) return;

    const [c1, c2, c3, c4] = target.colors;

    const mainApp = document.getElementById("mainLayoutApp");
    const slidingDash = document.getElementById("slidingDashboard");
    const chatSection = document.getElementById("chatSectionContainer");
    const fileList =
document.getElementById("fileList");

const editorTabsBar =
document.getElementById("editorTabsBar");
const newFileBtn =
document.getElementById("newFileBtn");

const explorerHeader =
document.getElementById("explorerHeader");
    const chatHeader = document.getElementById("chatHeaderBar");
    const toggleBtn = document.getElementById("dashboardToggleBtn");
    const sendBtn = document.getElementById("chatSendBtn");
    const micBtn = document.getElementById("micBtn");
    const floatingChatBtn =
document.getElementById("floatingChatBtn");

    const outerCodeBox = document.getElementById("editorOuterContainer");
    
    // Theme targets for the new execution console elements
    const runBtn = document.getElementById("runCodeExecutionBtn");
    const termBody = document.getElementById("terminalLogContentBody");
    const termHeader = document.getElementById("terminalHeaderBar");

    // Dynamic tint variations computed for layout structures
    let innerCanvasBg = "#fff";
    if (termBody) termBody.style.background = "#fff";
    if (termBody) termBody.style.color = "#111844";
    if (outerCodeBox) outerCodeBox.style.background = `rgba(255,255,255,0.25)`;

    if (themeKey === "theme1") {
        mainApp.style.background = c1; innerCanvasBg = "#D8C1B5";
        slidingDash.style.background = c4; slidingDash.style.color = c1;
        chatSection.style.background = c4; chatSection.style.borderLeft = `2px solid ${c2}`;
        chatHeader.style.background = c1; chatHeader.style.color = c4;
        toggleBtn.style.background = c2; sendBtn.style.background = c1; micBtn.style.background = c2;
       activityPopup.style.background =
"#D8C1B5";

activityPopup.querySelector(
"#activityPopupHeader"
).style.background =
"#6D3B1F";
    } 
    else if (themeKey === "theme2") {
        mainApp.style.background = c4;innerCanvasBg =  "#163E78";
        slidingDash.style.background = c2; slidingDash.style.color = c4;
        chatSection.style.background = c3; chatSection.style.borderLeft = `2px solid ${c1}`;
        chatHeader.style.background = c1; chatHeader.style.color = c2;
        toggleBtn.style.background = c1; sendBtn.style.background = c1; micBtn.style.background = c4;
       activityPopup.style.background =
"#6FA8E8";

activityPopup.querySelector(
"#activityPopupHeader"
).style.background =
"#082A6C";
    }
    else if (themeKey === "theme3") {
        mainApp.style.background = c4; innerCanvasBg = "#F2C7D7";
        slidingDash.style.background = c4; slidingDash.style.color = c1;
        chatSection.style.background = c4; chatSection.style.borderLeft = `2px solid ${c3}`;
        chatHeader.style.background = c3; chatHeader.style.color = "#fff";
        toggleBtn.style.background = c2; sendBtn.style.background = c2; micBtn.style.background = c3;
      activityPopup.style.background =
"#FFC4D8";

activityPopup.querySelector(
"#activityPopupHeader"
).style.background =
"#FF77AA";
    }
    else if (themeKey === "theme4") {
        mainApp.style.background = c3; innerCanvasBg = "#242424";
        slidingDash.style.background = c2; slidingDash.style.color = c1;
        chatSection.style.background = c2; chatSection.style.borderLeft = `2px solid ${c1}`;
        chatHeader.style.background = c4; chatHeader.style.color = c1;
        toggleBtn.style.background = c1; sendBtn.style.background = c1; micBtn.style.background = c4;
       activityPopup.style.background =
"#B8B8B8";

activityPopup.querySelector(
"#activityPopupHeader"
).style.background =
"#3A3A3A";
    }
   
    

    if (monaco && editor) {

    let editorTextColor = "#222222";
    let lineNumberColor = "#666666";

    if (themeKey === "theme1") {
editorTextColor = "#2E1C16";
lineNumberColor = "#7A5C4D";
    }

    else if (themeKey === "theme2") {
editorTextColor = "#F4FBFF";
lineNumberColor = "#9AC6FF";
    }

    else if (themeKey === "theme3") {
editorTextColor = "#4A2330";
lineNumberColor = "#8B4C61";
    }

    else if (themeKey === "theme4") {
        editorTextColor = "#F2F2F2";
lineNumberColor = "#8B8B8B";
    }

    monaco.editor.defineTheme('dynamicTheme', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
            'editor.background': innerCanvasBg,
            'editor.foreground': editorTextColor,
            'editorLineNumber.foreground': lineNumberColor
        }
    });
if (fileList) {

    fileList.style.background =
    innerCanvasBg;

    fileList.style.color =
    editorTextColor;
}

if (editorTabsBar) {

    editorTabsBar.style.background =
    c1;

    editorTabsBar.style.color =
    editorTextColor;
}
if (newFileBtn) {

    newFileBtn.style.background =
    "#ffffff";

    newFileBtn.style.color =
    "#111111";
}

if (explorerHeader) {

    explorerHeader.style.background =
    "#ffffff";

    explorerHeader.style.color =
    "#111111";
}
    monaco.editor.setTheme('dynamicTheme');
}
    renderActiveChannelsListUI();
    if (floatingChatBtn) {
    floatingChatBtn.style.background = c2;
    floatingChatBtn.style.color = "#FFFFFF";
}
}

// 5. PACKET RESPONSE RECEPTIONS


socket.on("restore_code", (code) => {

    window.codeRestored = true;

    if (editor) {

        isSyncing = true;

        editor.setValue(code);

        isSyncing = false;

    } else {

        pendingRestoredCode = code;

    }

});
socket.on(
    "restore_files",
    (files) => {

        workspaceFiles =
        files || {
            "Untitled":""
        };

        renderFileExplorer();
        renderEditorTabs();
    }
);
socket.on("code_change", (code) => {

    if(editor){

        isSyncing = true;

        editor.setValue(code);

        isSyncing = false;

    }

});
// Sync grammar changes across all screens simultaneously
socket.on("restore_language", (lang) => {

    const wait = setInterval(() => {

        if(editor){

            clearInterval(wait);

            const selector =
                document.getElementById(
                    "editorLanguageSelect"
                );

            if(selector){
                selector.value = lang;
            }

            changeWorkspaceLanguage(
                lang,
                false
            );
        }

    },100);

});
socket.on("language_change", (lang) => {

    const langSelect =
        document.getElementById(
            "editorLanguageSelect"
        );

    if (langSelect) {
        langSelect.value = lang;
    }

    changeWorkspaceLanguage(
        lang,
        false
    );

});
socket.on(
    "execution_started",
    () => {

        document
            .getElementById(
                "editorLanguageSelect"
            )
            .disabled = true;

    }
);

socket.on(
    "execution_finished",
    () => {

        document
            .getElementById(
                "editorLanguageSelect"
            )
            .disabled = false;

    }
);
// Dynamic listener for compiling results from our local server
// Dynamic streaming chunk data handler for interactive execution
function saveExecutionHistory(content) {
    if (!activeRoom) return;

    const key =
        EXECUTION_HISTORY_PREFIX + activeRoom;

    const existing =
        localStorage.getItem(key) || "";

    localStorage.setItem(
        key,
        existing + content
    );
}

function loadExecutionHistory() {
    const consoleBody =
        document.getElementById(
            "terminalLogContentBody"
        );

    if (!consoleBody || !activeRoom)
        return;

    const history =
        localStorage.getItem(
            EXECUTION_HISTORY_PREFIX +
            activeRoom
        ) || "";

    consoleBody.innerText = history;
}

function clearExecutionPanel() {
    const consoleBody =
        document.getElementById(
            "terminalLogContentBody"
        );

    if (consoleBody)
        consoleBody.innerText = "";
}
socket.on("execute_code_response", (data) => {
    const consoleBody = document.getElementById("terminalLogContentBody");
    if (!consoleBody) return;

   if (data.stderr) {
    consoleBody.innerText += data.stderr;
    saveExecutionHistory(data.stderr);
}
else if (data.output) {
    consoleBody.innerText += data.output;
    saveExecutionHistory(data.output);
}
else if (data.systemNotice) {
    consoleBody.innerText += data.systemNotice;
    saveExecutionHistory(data.systemNotice);
}
});
socket.on(
    "sync_terminal_input",
    (input) => {

        const field =
        document.getElementById(
            "terminalPromptInputField"
        );

        if(field){
            field.value = input;
        }

    }
);

// 6. MESSAGING FLOWS
function sendMessage() {
    const msgInput = document.getElementById("messageInput");
    if (!msgInput) return;
    const text = msgInput.value.trim();
    if (!text || !activeRoom) return;

    socket.emit("send_message", { 
        room: activeRoom,
        username: username,
        text: text
    });
    msgInput.value = "";
    socket.emit(
    "typing_stop",
    {
        room: activeRoom,
        username: username
    }
);
}
const fileInput =
document.getElementById("fileInput");

if (fileInput) {

    fileInput.addEventListener(
        "change",
        async (e) => {

            const file =
            e.target.files[0];

            if (!file || !activeRoom)
                return;

            const formData =
            new FormData();

            formData.append(
                "file",
                file
            );

            const response =
            await fetch(
                "/upload",
                {
                    method: "POST",
                    body: formData
                }
            );

            const result =
            await response.json();

            socket.emit(
                "send_file",
                {
                    roomID: activeRoom,
                    username,
                    fileName: file.name,
                    fileUrl: result.url,
                    room: activeRoom
                }
            );
        }
    );
}
socket.on(
    "restore_messages",
    (messages) => {

        const msgContainer =
            document.getElementById(
                "messages"
            );

        if (!msgContainer) return;

        msgContainer.innerHTML = "";

       messages.forEach((data) => {

    const div = document.createElement("div");

    div.style.padding = "12px 16px";
    div.style.borderRadius = "18px";
div.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
div.style.maxWidth = "85%";
div.style.width = "auto";
div.style.wordBreak = "break-word";
div.style.overflowWrap = "break-word";
div.style.boxSizing = "border-box";
div.style.fontSize = "13px";

const palette = colorPalettes[currentThemeKey].colors;
    if (data.fileUrl) {

        if (data.username === username) {
            div.style.alignSelf = "flex-end";
div.style.background = palette[1];
div.style.color = "#bc6b6b";
div.style.borderBottomRightRadius = "4px";
            div.innerHTML =
                `<strong>You:</strong>
                 <a href="${data.fileUrl}" target="_blank">
                 📎 ${data.fileName}
                 </a>`;
        } else {
            div.style.alignSelf = "flex-start";
div.style.background = palette[2];
div.style.color = "#490202";
div.style.borderBottomLeftRadius = "4px";
            div.innerHTML =
                `<strong>${data.username}:</strong>
                 <a href="${data.fileUrl}" target="_blank">
                 📎 ${data.fileName}
                 </a>`;
        }

    } else {

        if (data.username === username) {
            div.innerHTML =
                `<strong>You:</strong> ${data.text}`;
        } else {
            div.innerHTML =
                `<strong>${data.username}:</strong> ${data.text}`;
        }

    }

    msgContainer.appendChild(div);

});

    }
);
socket.on(
    "user_typing",
    (data) => {

        const indicator =
            document.getElementById(
                "typingIndicator"
            );

        if (!indicator) return;

        indicator.textContent =
            `${data.username} is typing...`;

    }
);
/*
socket.on(
    "cursor_update",
    (data) => {

        const bar =
            document.getElementById(
                "cursorStatusBar"
            );

        if (!bar) return;

        bar.textContent =
            `${data.username} → Line ${data.line}, Column ${data.column}`;

    }
);
*/
socket.on(
    "user_stop_typing",
    () => {

        const indicator =
            document.getElementById(
                "typingIndicator"
            );

        if (!indicator) return;

        indicator.textContent = "";

    }
);
socket.on("receive_message", (data) => {  
    if (data.room !== activeRoom) return;
    const msgContainer = document.getElementById("messages");
    if (!msgContainer) return;
    
    const div = document.createElement("div");
   div.style.padding = "12px 16px";
div.style.borderRadius = "18px";
div.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
div.style.maxWidth = "85%";
div.style.wordBreak = "break-word";
div.style.overflowWrap = "break-word";
div.style.boxSizing = "border-box";
    div.style.fontSize = "13px";
    
    const palette = colorPalettes[currentThemeKey].colors;
    
    if (data.username === username) {
        div.style.borderBottomRightRadius = "4px";
        div.style.alignSelf = "flex-end";
        div.style.background = palette[1];
        div.style.color = "#fff";
        div.innerHTML = `<strong>You:</strong> ${data.text}`;
    } else {
        div.style.borderBottomLeftRadius = "4px";
        div.style.alignSelf = "flex-start";
        div.style.background = palette[2];
        div.style.color = "#111";
        div.innerHTML = `<strong>${data.username}:</strong> ${data.text}`;
    }
    
    msgContainer.appendChild(div);
    msgContainer.scrollTop = msgContainer.scrollHeight;
    if(chatSectionContainer.style.display === "none"){

    unreadMessages++;
unreadChatCount.style.display = "flex";
    unreadChatCount.textContent =
        unreadMessages;
}
});
socket.on("receive_file", (data) => {

    if (data.room !== activeRoom) return;

    const msgContainer =
        document.getElementById("messages");

    if (!msgContainer) return;

    const div =
        document.createElement("div");

    div.style.padding = "12px 16px";
    div.style.borderRadius = "18px";

    if (data.username === username) {

        div.innerHTML =
            `<strong>You:</strong>
             <a href="${data.fileUrl}" target="_blank">
             📎 ${data.fileName}
             </a>`;

    } else {

        div.innerHTML =
            `<strong>${data.username}:</strong>
             <a href="${data.fileUrl}" target="_blank">
             📎 ${data.fileName}
             </a>`;
    }

    msgContainer.appendChild(div);
    msgContainer.scrollTop =
        msgContainer.scrollHeight;
});
let activeEditors = [];
socket.on(
"update_online_users",
(usersArray) => {

const userTray =
document.getElementById(
"activeUsersList"
);

if(!userTray) return;

userTray.innerHTML = `

<div
style="
display:flex;
align-items:center;
gap:8px;
font-weight:700;
color:#1b7f3a;
flex-wrap:wrap;
"
>

<span>
🟢 Online (${usersArray.length}) :
</span>

${usersArray.map(user => `

<div
class="online-avatar"
title="${user.username}"
>
${user.avatar || "😀"}
</div>

`).join("")}

</div>

`;

});
socket.on(
"active_editors_update",
(data) => {

activeEditors = data;

renderActivityPopup();

});
socket.on("room_deleted", () => {

    alert(
        `Room "${activeRoom}" has been deleted.`
    );

    connectedRoomsList =
    connectedRoomsList.filter(
        room => room !== activeRoom
    );

    localStorage.setItem(
        "workspaceConnectedRoomsList",
        JSON.stringify(connectedRoomsList)
    );

    renderActiveChannelsListUI();

    document.getElementById(
        "messages"
    ).innerHTML = "";

    activeRoom = "";
    clearExecutionPanel();
});
socket.on(
    "room_delete_failed",
    (msg) => {

        alert(msg);

    }
);
// 7. AUDIO CHANNELS
let mediaRecorder; let audioChunks = []; let isRecording = false;
function toggleRecording() {
    const micBtn = document.getElementById("micBtn");
    if (!micBtn) return;
    if (!isRecording) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            mediaRecorder = new MediaRecorder(stream); audioChunks = [];
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const reader = new FileReader(); reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    socket.emit("voice_message", { room: activeRoom, username: username, audioData: reader.result });
                };
            };
            mediaRecorder.start(); isRecording = true; micBtn.innerText = "🛑";
        }).catch(() => alert("Microphone channel check failed."));
    } else {
        if (mediaRecorder) mediaRecorder.stop(); isRecording = false; micBtn.innerText = "🎙️";
    }
}
socket.on("incoming_voice_message", (data) => {
    if (data.room !== activeRoom) return;
    const msgContainer = document.getElementById("messages"); if (!msgContainer) return;
    const div = document.createElement("div"); div.style.padding = "8px 12px"; div.style.borderRadius = "8px"; div.style.maxWidth = "70%";
div.style.wordBreak = "break-word";
div.style.overflowWrap = "break-word";
div.style.boxSizing = "border-box";
    const palette = colorPalettes[currentThemeKey].colors;
    if (data.username === username) {
        div.style.alignSelf = "flex-end"; div.style.background = palette[1];
        div.innerHTML = `<strong>You:</strong> <audio src="${data.audioData}" controls style="max-width: 200px; display: block; margin-top: 4px;"></audio>`;
    } else {
        div.style.alignSelf = "flex-start"; div.style.background = palette[2];
        div.innerHTML = `<strong>${data.username}:</strong> <audio src="${data.audioData}" controls style="max-width: 200px; display: block; margin-top: 4px;"></audio>`;
    }
    msgContainer.appendChild(div); msgContainer.scrollTop = msgContainer.scrollHeight;
});
// ⚡ SANDBOXED CODE EXECUTION CONTROLLER MECHANISM


// 🌍 MULTI-LANGUAGE SYNTAX SHIFTER


// ⚡ MULTI-LANGUAGE ENGINE EXECUTION & REAL-TIME COMPILER DEBUGGER
// ⚡ MULTI-LANGUAGE ENGINE EXECUTION & REAL-TIME COMPILER DEBUGGER (JUDGE0 ENGINE)
// ⚡ NATIVE HARDWIRED CODE EXECUTION ENGINE
function executeCurrentWorkspaceCode() {
    const consoleBody = document.getElementById("terminalLogContentBody");
    if (!consoleBody) return;

    consoleBody.innerText = "";

    if (!editor) {
        consoleBody.innerText += "⚠️ Error: Workspace editor frame initialization not completed.";
        return;
    }

    const userScriptCode = editor.getValue();
    const selectedLanguageElement = document.getElementById("editorLanguageSelect");
    let currentLang = selectedLanguageElement ? selectedLanguageElement.value : "javascript";
    console.log(
    document.getElementById("terminalPromptInputField")
);

console.log(
    document.getElementById("editorLanguageSelect")
);

console.log(
    document.getElementById("terminalLogContentBody")
);

    // Direct socket-stream delivery pipeline bypasses tricky external API endpoints completely!
socket.emit(
    "execute_code_request",
    {
        language: currentLang,
        code: userScriptCode,
        room: activeRoom,
stdin: document.getElementById(
    "terminalPromptInputField"
).value
    }
);
}
function previewWorkspaceProject() {

    const htmlContent =
        workspaceFiles["index.html"];

    if(!htmlContent) {

        alert(
            "Create index.html first."
        );

        return;
    }

    const cssContent =
        workspaceFiles["style.css"] || "";

    const jsContent =
        workspaceFiles["script.js"] || "";

    let finalHtml = htmlContent;

    finalHtml =
        finalHtml.replace(
            "</head>",
            `<style>${cssContent}</style></head>`
        );

    finalHtml =
        finalHtml.replace(
            "</body>",
            `<script>${jsContent}<\/script></body>`
        );

    const previewBlob =
        new Blob(
            [finalHtml],
            { type: "text/html" }
        );

    const previewUrl =
        URL.createObjectURL(previewBlob);

    window.open(
        previewUrl,
        "_blank"
    );
}
function clearTerminalLogStream() {
    const consoleBody = document.getElementById("terminalLogContentBody");
    if (consoleBody) consoleBody.innerText = "Console logs cleared.";
}
// Transmit input field values down to the live active process thread
function sendTerminalInputBufferData() {
    const inputField = document.getElementById("terminalPromptInputField");
    if (!inputField || !inputField.value.trim()) return;

    const userInputValue = inputField.value;
    socket.emit(
    "sync_terminal_input",
    {
        room: activeRoom,
        input: userInputValue
    }
);
    // Append your inputted text down on screen layout history logs
    const consoleBody = document.getElementById("terminalLogContentBody");
    if (consoleBody) consoleBody.innerText += userInputValue + "\n";

    // Forward the terminal prompt text over the web sockets
    socket.emit("terminal_input_stream", { input: userInputValue });
    
    // Clear field out for your next instruction inputs
    inputField.value = "";
}
// 🌍 MULTI-LANGUAGE SYNTAX SHIFTER
function changeWorkspaceLanguage(selectedLang, emitToRoom = true) {
    if (!editor) return;

    // Change syntax formatting guidelines inside the Monaco frame instance
    const model = editor.getModel();
    if (model) {
        monaco.editor.setModelLanguage(model, selectedLang);
        if(editor.getValue().trim()==="" && !window.codeRestored 
    ){

    const templates = {

javascript:
`console.log("Hello World");`,

python:
`print("Hello World")`,

java:
`class Main {
    public static void main(String[] args){
        System.out.println("Hello World");
    }
}`,

cpp:
`#include <iostream>
using namespace std;

int main() {
    cout<<"Hello World";
}`,

c:
`#include <stdio.h>

int main() {
    printf("Hello World");
}`
    };

    editor.setValue(
        templates[selectedLang]
    );
}
    }

    // Broadcast the change to all room members
    if (emitToRoom && activeRoom) {
        socket.emit("language_change", { room: activeRoom, language: selectedLang });
    }
}
function deleteCurrentRoom() {
if (
!confirm(
"Are you sure you want to delete this room?"
)
){
return;
}
    if (!activeRoom) return;

    const confirmDelete =
    confirm(
        `Delete room "${activeRoom}" ?`
    );

    if(!confirmDelete) return;

    socket.emit(
    "delete_room",
    {
        roomID: activeRoom,
        username: username
    }
);
}
function copyInviteLink() {

    if (!activeRoom) {
        alert("Join or create a room first!");
        return;
    }

    const inviteLink =
        window.location.origin +
        "/room/" +
        encodeURIComponent(activeRoom);

    navigator.clipboard.writeText(inviteLink)
        .then(() => {

            alert(
                "Invite link copied!\n\n" +
                inviteLink
            );

        })
        .catch(() => {

            alert(
                "Failed to copy invite link."
            );

        });
}
function leaveCurrentRoom() {
if (
!confirm(
"Are you sure you want to exit this room?"
)
){
return;
}
    if (!activeRoom) return;

    socket.emit(
        "leave_room",
        activeRoom
    );

    connectedRoomsList =
    connectedRoomsList.filter(
        room => room !== activeRoom
    );

    localStorage.setItem(
        "workspaceConnectedRoomsList",
        JSON.stringify(connectedRoomsList)
    );

    renderActiveChannelsListUI();

    document.getElementById(
        "messages"
    ).innerHTML = "";

    activeRoom = "";
clearExecutionPanel();
document.getElementById(
    "chatHeaderTitle"
).innerHTML =
    "💬 No Active Room";
}
const minimizeChatBtn =
document.getElementById("minimizeChatBtn");

const floatingChatBtn =
document.getElementById("floatingChatBtn");
const activityBtn =
document.getElementById("activityBtn");

const activityPopup =
document.getElementById("activityPopup");

const activityPopupBody =
document.getElementById("activityPopupBody");

const closeActivityPopup =
document.getElementById("closeActivityPopup");
const unreadChatCount =
document.getElementById("unreadChatCount");

const chatSectionContainer =
document.getElementById("chatSectionContainer");

const mainLayoutApp =
document.getElementById("mainLayoutApp");
const newFileBtn =
document.getElementById("newFileBtn");
const newFolderBtn =
document.getElementById("newFolderBtn");
const importFolderBtn =
document.getElementById("importFolderBtn");

const folderImportInput =
document.getElementById("folderImportInput");
let unreadMessages = 0;

let workspaceFiles = {
    "Untitled":""
};
let selectedFolder =
localStorage.getItem(
    "selectedFolder"
) || "";
setTimeout(() => {

    renderFileExplorer();
renderEditorTabs();
newFolderBtn.onclick = () => {

    const folderName = prompt(
        "Enter folder name"
    );

    if(!folderName) return;

    const folderKey =
    folderName + "/__folder__";

    if(workspaceFiles[folderKey]) {

        alert(
            "Folder already exists"
        );

        return;
    }

   workspaceFiles[folderKey] = "";

socket.emit(
    "sync_workspace_files",
    {
        room: activeRoom,
        files: workspaceFiles
    }
);

renderFileExplorer();
renderEditorTabs();
};
importFolderBtn.onclick = () => {

    folderImportInput.click();

};

folderImportInput.onchange = async (e) => {

  const files =
Array.from(e.target.files);

if(!files.length) return;

for(const file of files){

    const path =
    file.webkitRelativePath;

    const content =
    await file.text();

    workspaceFiles[path] =
    content;

    const pathParts =
    path.split("/");

    if(pathParts.length > 1){

        let currentPath = "";

        for(
            let i = 0;
            i < pathParts.length - 1;
            i++
        ){

            currentPath +=
            pathParts[i];

            const folderKey =
            currentPath +
            "/__folder__";

            if(
                !workspaceFiles[
                    folderKey
                ]
            ){
                workspaceFiles[
                    folderKey
                ] = "";
            }

            currentPath += "/";
        }
    }
}

socket.emit(
    "sync_workspace_files",
    {
        room: activeRoom,
        files: workspaceFiles
    }
);

renderFileExplorer();
renderEditorTabs();

alert(
    files.length +
    " files imported successfully"
);

folderImportInput.value = "";
};
    newFileBtn.onclick = () => {

    const fileName = prompt(
        "Enter file name without extension"
    );

    if(!fileName) return;

    const langMap = {
        javascript: ".js",
        typescript: ".ts",
        python: ".py",
        c: ".c",
        cpp: ".cpp",
        java: ".java",
        csharp: ".cs",
        html: ".html",
css: ".css",
        go: ".go",
        rust: ".rs"
    };

    const currentLang =
        document.getElementById(
            "editorLanguageSelect"
        ).value;
const extensionMap = {
    javascript: ".js",
    typescript: ".ts",
    python: ".py",
    c: ".c",
    cpp: ".cpp",
    java: ".java",
    csharp: ".cs",

    html: ".html",
    css: ".css",

    go: ".go",
    rust: ".rs"
};


let finalName =
fileName + langMap[currentLang];



workspaceFiles[finalName] = "";

activeFile = finalName;

if (
    typeof editor !== "undefined" &&
    editor
) {
    editor.setValue("");
}

socket.emit(
    "sync_workspace_files",
    {
        room: activeRoom,
        files: workspaceFiles
    }
);

localStorage.setItem(
    "workspaceActiveFile",
    activeFile
);

renderFileExplorer();
renderEditorTabs();
};

},1000);

let activeFile =

localStorage.getItem(
    "workspaceActiveFile"
) || "Untitled";
if (
    workspaceFiles[activeFile]
    &&
    typeof editor !== "undefined"
    &&
    editor
) {

    editor.setValue(
        workspaceFiles[activeFile]
    );
}
if(unreadChatCount){
    unreadChatCount.style.display = "none";
}
// ==========================================
// REAL-TIME NATIVE RUNTIME COMPILER ENGINE
// ==========================================
function renderFileExplorer() {

    const fileList =
    document.getElementById("fileList");

    if(!fileList) return;

   fileList.innerHTML = "";

const sortedItems =
Object.keys(workspaceFiles)
.sort();

sortedItems.forEach(fileName => {

    const depth =
    fileName.split("/").length - 1;

    const isFolder =
    fileName.endsWith("/__folder__");

    const div =
    document.createElement("div");

    div.className =
    "file-item" +
    (
        fileName === activeFile
        ? " active"
        : ""
    );

    const displayName =
    isFolder
    ? fileName
        .replace("/__folder__","")
        .split("/")
        .pop()
    : fileName.split("/").pop();

    let prefix = "";

    for(let i=0;i<depth;i++){
        prefix += "↳ ";
    }

    div.innerHTML =
    `
    <span class="file-name">
        ${prefix}
        ${isFolder ? "📁" : "📄"}
        ${displayName}
    </span>
    `;

    div.onclick = () => {

        if(isFolder){

            selectedFolder =
            fileName.replace(
                "/__folder__",
                ""
            );

            renderFileExplorer();

            return;
        }

        workspaceFiles[activeFile] =
        editor.getValue();
activeFile = fileName;
currentEditingFile = fileName;

const ext =
fileName.split(".").pop().toLowerCase();

const langSelect =
document.getElementById(
    "editorLanguageSelect"
);

if(langSelect){

    const extensionMap = {

        c: "c",
        cpp: "cpp",
        cc: "cpp",
        cxx: "cpp",

        js: "javascript",

        py: "python",

        java: "java",

        cs: "csharp",

        go: "go",

        rs: "rust",

        ts: "typescript",

        html: "html",

        css: "css"
    };

    if(extensionMap[ext]){

        langSelect.value =
        extensionMap[ext];

        changeWorkspaceLanguage(
            extensionMap[ext]
        );
    }
}

socket.emit(
"editing_status",
{
room: activeRoom,
username,
file: fileName
}
);
        localStorage.setItem(
            "workspaceActiveFile",
            activeFile
        );

        editor.setValue(
            workspaceFiles[fileName]
        );
let hiddenTabs =
JSON.parse(
    localStorage.getItem(
        "hiddenTabs"
    ) || "[]"
);

hiddenTabs =
hiddenTabs.filter(
    name =>
    name !== fileName
);

localStorage.setItem(
    "hiddenTabs",
    JSON.stringify(
        hiddenTabs
    )
);
        renderFileExplorer();
        renderEditorTabs();
    };

   div.oncontextmenu = (e) => {

    e.preventDefault();

    const isFolderItem =
    fileName.endsWith("/__folder__");

    let menuText;

    if(isFolderItem){

        menuText =
`Choose action:

n = New File
s = New Subfolder
d = Delete Folder`;
    }
    else{

        menuText =
`Choose action:

r = Rename File
d = Delete File`;
    }

    const action =
    prompt(menuText);

    if(!action) return;

    // ======================
    // FILE OPERATIONS
    // ======================

    if(!isFolderItem){

        if(action === "r"){

            const newName =
            prompt(
                "Enter new file name",
                fileName.split("/").pop()
            );

            if(!newName) return;

            workspaceFiles[newName] =
            workspaceFiles[fileName];

            delete workspaceFiles[fileName];

            socket.emit(
                "sync_workspace_files",
                {
                    room: activeRoom,
                    files: workspaceFiles
                }
            );

            renderFileExplorer();
            renderEditorTabs();

            return;
        }

        if(action === "d"){

            delete workspaceFiles[fileName];

            socket.emit(
                "sync_workspace_files",
                {
                    room: activeRoom,
                    files: workspaceFiles
                }
            );

            renderFileExplorer();
            renderEditorTabs();

            return;
        }

        return;
    }

    // ======================
    // FOLDER OPERATIONS
    // ======================

    const folderPath =
    fileName.replace(
        "/__folder__",
        ""
    );

    if(action === "n"){

        const fileBaseName =
        prompt("Enter file name");

        if(!fileBaseName) return;

        const extension =
        document.getElementById(
            "editorLanguageSelect"
        ).value;

        const extensionMap = {
            javascript: ".js",
            typescript: ".ts",
            python: ".py",
            c: ".c",
            cpp: ".cpp",
            java: ".java",
            csharp: ".cs",
            html: ".html",
            css: ".css",
            go: ".go",
            rust: ".rs"
        };

        const finalName =
        folderPath +
        "/" +
        fileBaseName +
        extensionMap[extension];

        workspaceFiles[finalName] = "";

        socket.emit(
            "sync_workspace_files",
            {
                room: activeRoom,
                files: workspaceFiles
            }
        );

        renderFileExplorer();
        renderEditorTabs();

        return;
    }

    if(action === "s"){

        const subFolderName =
        prompt(
            "Enter subfolder name"
        );

        if(!subFolderName) return;

        const subFolderKey =
        folderPath +
        "/" +
        subFolderName +
        "/__folder__";

        workspaceFiles[subFolderKey] =
        "";

        socket.emit(
            "sync_workspace_files",
            {
                room: activeRoom,
                files: workspaceFiles
            }
        );

        renderFileExplorer();
        renderEditorTabs();

        return;
    }

    if(action === "d"){

        delete workspaceFiles[fileName];

        Object.keys(workspaceFiles)
        .forEach(key => {

            if(
                key.startsWith(
                    folderPath + "/"
                )
            ){
                delete workspaceFiles[key];
            }
        });

        socket.emit(
            "sync_workspace_files",
            {
                room: activeRoom,
                files: workspaceFiles
            }
        );

        renderFileExplorer();
        renderEditorTabs();

        return;
    }

};

    fileList.appendChild(div);

});
}
function renderEditorTabs() {

    const tabsBar =
    document.getElementById(
        "editorTabsBar"
    );

    if(!tabsBar) return;

tabsBar.innerHTML = "";

const hiddenTabs =
JSON.parse(
    localStorage.getItem(
        "hiddenTabs"
    ) || "[]"
);

Object.keys(workspaceFiles)
.filter(
    fileName =>
    !hiddenTabs.includes(fileName)
)
.forEach(fileName => {

        const tab =
        document.createElement("div");

        tab.className =
        "editor-tab" +
        (fileName === activeFile
        ? " active"
        : "") +
        (fileName === "Untitled"
        ? " unsaved"
        : "");

tab.innerHTML =
`
<span class="tab-title">
    ${fileName}
</span>

<span class="tab-close">
    ✕
</span>
`;

        tab.onclick = () => {

            workspaceFiles[activeFile] =
            editor.getValue();

            activeFile =
            fileName;

            editor.setValue(
                workspaceFiles[fileName]
            );

            renderFileExplorer();
            renderEditorTabs();
        };
const closeBtn =
tab.querySelector(
    ".tab-close"
);

closeBtn.onclick = (e) => {

    e.stopPropagation();

    const hiddenTabs =
    JSON.parse(
        localStorage.getItem(
            "hiddenTabs"
        ) || "[]"
    );

    if(
        !hiddenTabs.includes(
            fileName
        )
    ){
        hiddenTabs.push(
            fileName
        );
    }

    localStorage.setItem(
        "hiddenTabs",
        JSON.stringify(
            hiddenTabs
        )
    );

    renderEditorTabs();
};
        tabsBar.appendChild(tab);
    });
}
function copyInviteLink() {

    if (!activeRoom) {

        alert(
            "Join a room first"
        );

        return;

    }

    const inviteLink =
`${window.location.origin}/room/${encodeURIComponent(activeRoom)}`;

    navigator.clipboard.writeText(
        inviteLink
    );

    alert(
        "Invite link copied!"
    );

}
minimizeChatBtn.addEventListener("click", () => {
chatSectionContainer.style.display = "none";
mainLayoutApp.style.gridTemplateColumns = "100%";

   floatingChatBtn.style.display = "flex";

if(unreadMessages > 0){
    unreadChatCount.style.display = "flex";
}
});
floatingChatBtn.addEventListener("click", () => {

chatSectionContainer.style.display = "";
mainLayoutApp.style.gridTemplateColumns = "65% 35%";

    floatingChatBtn.style.display = "none";

    unreadMessages = 0;

    unreadChatCount.textContent = "0";
    unreadChatCount.style.display = "none";
});
function renderActivityPopup(){

if(!activityPopupBody) return;

activityPopupBody.innerHTML = "";

activeEditors.forEach(user => {

if(!user.file) return;

const row =
document.createElement("div");

row.className =
"activity-user-row";

row.innerHTML = `
<b>${user.username}</b>
<br>
${user.file}
`;

activityPopupBody.appendChild(row);

});

}
activityBtn.onclick = () => {

activityPopup.style.display =
"flex";

};

closeActivityPopup.onclick = () => {

activityPopup.style.display =
"none";

};