function doGet(e) {
  var action   = e.parameter.action;
  var widgetId = e.parameter.widget || "default";
  var callback = e.parameter.callback || "callback";
  var result   = {};

  ensureSheets(); 

  if (action === "submit") {
    result = handleSubmit(e, widgetId);
  } 
  else if (action === "vote") {
    result = handleVote(e, widgetId);
  } 
  else if (action === "list") {
    result = handleList(widgetId);
  } 
  else {
      result.error = "Unknown action";
  }

  var output = callback + "(" + JSON.stringify(result) + ")";
  
  return ContentService
    .createTextOutput(output)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function ensureSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var captions = ss.getSheetByName("Captions");
  if (!captions) {
    captions = ss.insertSheet("Captions");
    
    captions.appendRow(["widget","id","text","votes","ts","by","tsNum"]);
  
  }

  var votes = ss.getSheetByName("Votes");
  
  if (!votes) {
    votes = ss.insertSheet("Votes");
     votes.appendRow(["widget","captionId","voter","ts"]);
  }
}

function handleSubmit(e, widgetId) {
  var text = (e.parameter.text || "").trim();
  var by   = e.parameter.by || "anon";

  if (!text) return { error: "Empty caption" };
  if (text.length > 140) return { error: "Caption too long" };

  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var sh   = ss.getSheetByName("Captions");
  var id   = "c_" + new Date().getTime();
  var ts   = new Date();
  var tsNum = ts.getTime();

  sh.appendRow([widgetId, id, text, 0, ts, by, tsNum]);

  return { success: true, id: id, text: text, by: by, votes: 0, ts: ts, tsNum: tsNum };
}

function handleVote(e, widgetId) {
  var captionId = e.parameter.id;
  var voter     = e.parameter.voter || "anon";

  if (!captionId) return { error: "Missing captionId" };

  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var cap  = ss.getSheetByName("Captions");
  var vote = ss.getSheetByName("Votes");

  var voteVals = vote.getDataRange().getValues();
  for (var i = 1; i < voteVals.length; i++) {
    if (voteVals[i][0] === widgetId && voteVals[i][1] === captionId && voteVals[i][2] === voter) {
      return { error: "Already voted" };
    }
  }

  vote.appendRow([widgetId, captionId, voter, new Date()]);

  var capVals = cap.getDataRange().getValues();
  for (var j = 1; j < capVals.length; j++) {
    if (capVals[j][0] === widgetId && capVals[j][1] === captionId) {
      var row = j + 1;
      var votes = Number(capVals[j][3]) || 0;
      votes++;
      cap.getRange(row, 4).setValue(votes);
      return { success: true, id: captionId, votes: votes };
    }
  }
  return { error: "Caption not found" };
}

function handleList(widgetId) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var sh   = ss.getSheetByName("Captions");
  var vals = sh.getDataRange().getValues();

  var items = [];
  for (var i = 1; i < vals.length; i++) {
    if (vals[i][0] === widgetId) {
      items.push({
        id: vals[i][1],
        text: vals[i][2],
        votes: Number(vals[i][3]) || 0,
        ts: vals[i][4],
        by: vals[i][5],
        tsNum: Number(vals[i][6]) || 0
      });
    }
  }

  return { items: items };
}
