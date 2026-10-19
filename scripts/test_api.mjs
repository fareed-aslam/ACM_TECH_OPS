import fs from "fs";
import Papa from "papaparse";

async function run() {
  console.log("--- 1. Testing Admin Login ---");
  const loginRes = await fetch("http://localhost:3000/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "acmadmin2026" }),
  });
  const loginData = await loginRes.json();
  console.log("Login status:", loginRes.status, "Token:", loginData.token ? "Present" : "Missing");
  const adminToken = loginData.token;

  console.log("\n--- Resetting Game to Lobby ---");
  await fetch("http://localhost:3000/api/admin/reset", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  console.log("\n--- 2. Importing sample-questions.csv ---");
  const csvText = fs.readFileSync("./sample-questions.csv", "utf-8");
  const parsed = Papa.parse(csvText, { skipEmptyLines: "greedy" });
  let rows = parsed.data;
  if (rows[0][0].toLowerCase() === "question") rows = rows.slice(1);
  const questions = rows.map((r) => ({
    text: r[0],
    options: r.slice(1, 5),
    correct: Number(r[5]),
  }));
  console.log("Parsed questions count:", questions.length);

  const importRes = await fetch("http://localhost:3000/api/admin/questions/import", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ questions, mode: "replace" }),
  });
  const importData = await importRes.json();
  console.log("Import status:", importRes.status, importData);

  console.log("\n--- 3. Testing Settings & PIN ---");
  const settingsRes = await fetch("http://localhost:3000/api/admin/settings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pin: "ACM2026",
      totalMinutes: 15,
      secondsPerQuestion: 15,
      questionsPerStudent: 5,
    }),
  });
  console.log("Settings update:", await settingsRes.json());

  console.log("\n--- 4. Testing Student Join ---");
  const joinFail = await fetch("http://localhost:3000/api/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Harry Potter", roll: "22K-1234", pin: "WRONG" }),
  });
  console.log("Wrong PIN join (should be 400):", joinFail.status, (await joinFail.json()).error);

  const joinSuccess = await fetch("http://localhost:3000/api/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Harry Potter", roll: "22K-1234", pin: "ACM2026" }),
  });
  const joinData = await joinSuccess.json();
  console.log("Correct PIN join:", joinSuccess.status, "Token:", joinData.token ? "Received" : "Missing");
  const studentToken = joinData.token;

  console.log("\n--- 5. Duplicate Roll Number Test ---");
  const joinDup = await fetch("http://localhost:3000/api/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Impostor", roll: "22K-1234", pin: "ACM2026" }),
  });
  console.log("Duplicate roll from other device (should be 400):", joinDup.status, (await joinDup.json()).error);

  console.log("\n--- 6. Play in Lobby ---");
  const lobbyState = await fetch("http://localhost:3000/api/play", {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  console.log("Lobby state:", await lobbyState.json());

  console.log("\n--- 7. Admin Starts Game ---");
  const startRes = await fetch("http://localhost:3000/api/admin/start", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log("Start game:", (await startRes.json()).ok ? "Game Started" : "Error");

  console.log("\n--- 8. Play Active Question ---");
  const qStateRes = await fetch("http://localhost:3000/api/play", {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const qState = await qStateRes.json();
  console.log("Phase:", qState.phase);
  console.log("Question 1:", qState.question?.number, "of", qState.question?.total);
  console.log("Question text:", qState.question?.text);
  console.log("Question options:", qState.question?.options);
  console.log("Seconds left:", qState.question?.secondsLeft);

  console.log("\n--- 9. Answering Question ---");
  const answerRes = await fetch("http://localhost:3000/api/answer", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${studentToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      questionNumber: qState.question.number,
      answer: 1,
    }),
  });
  console.log("Answer response:", await answerRes.json());

  console.log("\n--- 10. Anti-Cheat Flag ---");
  const flagRes = await fetch("http://localhost:3000/api/flag", {
    method: "POST",
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  console.log("Flag tab-switch status:", flagRes.status, await flagRes.json());

  console.log("\n--- 11. Projector / Leaderboard ---");
  const boardRes = await fetch("http://localhost:3000/api/leaderboard");
  console.log("Leaderboard:", await boardRes.json());

  console.log("\n--- 12. Download Results CSV ---");
  const csvRes = await fetch("http://localhost:3000/api/admin/results.csv", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const csvOutput = await csvRes.text();
  console.log("CSV status:", csvRes.status);
  console.log("CSV Content:\n" + csvOutput);
}

run().catch(console.error);
