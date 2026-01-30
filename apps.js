/**
 * 웹 앱으로 배포하여 POST 요청을 받는 메인 함수
 */
function doPost(e) {

  const ADMIN_EMAIL = "kimsoy4631@kentech.ac.kr, kmgi0312@gmail.com"; 

  const lock = LockService.getScriptLock();
  
  // 이메일 발송을 위한 데이터 컨테이너
  let emailPayload = null;
  // 클라이언트 응답 데이터
  let responsePayload = null;

  try {
    // 1. Critical Section Start
    // 최대 30초 동안 대기하며 순서가 오면 실행
    lock.waitLock(30000); 

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const requestData = JSON.parse(e.postData.contents);
    
    const name = requestData.name ? String(requestData.name).trim() : null;
    const dob = requestData.dob ? String(requestData.dob).trim() : null;

    if (!name || !dob) {
      return createResponse({ result: 'error', message: '이름과 생년월일이 누락되었습니다.' });
    }

    // 시트 데이터 및 헤더 가져오기
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    const nameIdx = headers.indexOf('이름');
    const dobIdx = headers.indexOf('생년월일'); 
    const genderIdx = headers.indexOf('성별');
    const houseIdx = headers.indexOf('하우스');
    const timeIdx = headers.indexOf('배정시각');
    const agreeIdx = headers.indexOf('배정동의');
    const seqIdx = headers.indexOf('배정순번');
    
    let ipIdx = headers.indexOf('IP주소');
    if (ipIdx === -1) ipIdx = headers.indexOf('IP'); 

    if (nameIdx === -1 || dobIdx === -1 || genderIdx === -1 || houseIdx === -1) {
      return createResponse({ result: 'error', message: '시트 헤더 설정이 올바르지 않습니다.' });
    }

    let foundRowIndex = -1;
    let studentData = null;

    // 1-1. 학생 검색
    for (let i = 1; i < data.length; i++) {
      const sName = String(data[i][nameIdx]).trim();
      const sDob = String(data[i][dobIdx]).trim();
      
      if (sName === name && sDob === dob) {
        foundRowIndex = i + 1;
        studentData = data[i];
        break;
      }
    }

    if (foundRowIndex === -1) {
      return createResponse({ result: 'error', message: '일치하는 학생 정보가 없습니다.' });
    }

    let assignedHouse = studentData[houseIdx] ? String(studentData[houseIdx]).trim() : "";
    const isAlreadyAssigned = (assignedHouse !== "");
    const currentGender = String(studentData[genderIdx]).trim();

    // 1-2. 하우스가 비어있을 때만 신규 배정 (이메일 발송 예약)
    if (!assignedHouse || assignedHouse === "") {
      assignedHouse = getBalancedHouse(data, houseIdx, genderIdx, currentGender);
      
      // --- [데이터 준비] ---
      const assignmentTime = new Date().toLocaleString('ko-KR'); // 배정 시각
      
      let clientIp = "-";
      if (requestData.userIP) {
        clientIp = String(requestData.userIP).trim();
        if (clientIp.startsWith('=')) clientIp = "'" + clientIp;
      }

      let seqInfo = "순번 없음"; 

      // --- [시트 기록] ---
      // 하우스
      sheet.getRange(foundRowIndex, houseIdx + 1).setValue(assignedHouse);
      
      // 배정 시각 (기존 '확인시간')
      if (timeIdx !== -1) {
        sheet.getRange(foundRowIndex, timeIdx + 1).setValue(assignmentTime);
      }

      // 배정 동의
      if (agreeIdx !== -1 && requestData.agree) {
        sheet.getRange(foundRowIndex, agreeIdx + 1).setValue("동의완료");
      }

      // IP 주소
      if (ipIdx !== -1 && requestData.userIP) {
        sheet.getRange(foundRowIndex, ipIdx + 1).setValue(clientIp);
      }
      
      // 순번 및 통계 계산
      if (seqIdx !== -1) {
        let maxSeq = 0;
        let countStats = { 'E_M': 0, 'E_F': 0, 'T_M': 0, 'T_F': 0 };

        for (let i = 1; i < data.length; i++) {
          if (i === foundRowIndex - 1) continue;

          const rGender = String(data[i][genderIdx] || "").normalize('NFC').trim();
          const rHouse = String(data[i][houseIdx] || "").toUpperCase().trim();

          if (rHouse === 'EDISON') {
            if (rGender === '남' || rGender === '남자') countStats.E_M++;
            else if (rGender === '여' || rGender === '여자') countStats.E_F++;
          } else if (rHouse === 'TESLA') {
            if (rGender === '남' || rGender === '남자') countStats.T_M++;
            else if (rGender === '여' || rGender === '여자') countStats.T_F++;
          }

          const seqCell = String(data[i][seqIdx] || "").trim();
          const seqNum = parseInt(seqCell.split(' ')[0]);
          if (!isNaN(seqNum) && seqNum > maxSeq) {
            maxSeq = seqNum;
          }
        }

        // 현재 배정 결과 반영
        if (assignedHouse.toUpperCase() === 'EDISON') {
          if (currentGender === '남' || currentGender === '남자') countStats.E_M++;
          else countStats.E_F++;
        } else { 
          if (currentGender === '남' || currentGender === '남자') countStats.T_M++;
          else countStats.T_F++;
        }

        const newSeq = maxSeq + 1;
        seqInfo = `${newSeq} E(${countStats.E_M},${countStats.E_F}) T(${countStats.T_M},${countStats.T_F})`;

        sheet.getRange(foundRowIndex, seqIdx + 1).setValue(seqInfo);
      }
      
      SpreadsheetApp.flush();

      // --- [이메일 발송 데이터 준비] ---
      // Lock을 빨리 해제하기 위해 여기서는 데이터만 준비하고, 발송은 finally 블록 이후(Lock 해제 후)에 시도합니다.
      emailPayload = {
        name: name,
        dob: dob,
        gender: currentGender,
        house: assignedHouse,
        time: assignmentTime,
        seq: seqInfo,
        ip: clientIp,
        sheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl()
      };
    }

    responsePayload = { 
      result: 'success', 
      house: assignedHouse,
      isAlreadyAssigned: isAlreadyAssigned
    };

  } catch (error) {
    return createResponse({ result: 'error', message: error.toString() });
  } finally {
    // [중요] 모든 시트 작업이 끝났으므로 즉시 잠금 해제
    // 이 시점 이후로는 다른 유저가 대기 없이 진입 가능
    lock.releaseLock();
  }

  // 4. Send Email (Outside Lock)
  // Lock이 해제된 상태이므로 타임아웃 위험이 줄어듦. (단, 일일 전송량 제한 등은 여전히 존재)
  if (emailPayload) {
    try {
      sendAdminEmail(ADMIN_EMAIL, emailPayload);
    } catch (e) {
      console.error("메일 전송 실패 (Non-blocking): " + e.toString());
      // 메일 실패가 유저에게 에러로 보일 필요는 없음
    }
  }

  return createResponse(responsePayload);
}

/**
 * 관리자에게 알림 메일을 전송하는 함수
 */
function sendAdminEmail(adminEmail, data) {
  const subject = `[신규배정] ${data.name} (${data.house})`;
  
  const body = `새로운 하우스 배정이 완료되었습니다.\n\n` +
             `[학생 정보]\n` +
             `• 이름: ${data.name}\n` +
             `• 생년월일: ${data.dob}\n` +
             `• 성별: ${data.gender}\n\n` +
             
             `[배정 결과]\n` +
             `• 하우스: ${data.house}\n` +
             `• 배정시각: ${data.time}\n` +
             `• 배정순번: ${data.seq}\n\n` +
             
             `[기타 정보]\n` +
             `• IP 주소: ${data.ip}\n` +
             `--------------------------------\n` +
             `구글 시트 바로가기: ${data.sheetUrl}`;
  
  MailApp.sendEmail({
    to: adminEmail,
    subject: subject,
    body: body
  });
}

/**
 * 성별 균형을 맞춰 하우스를 배정하는 함수
 */
function getBalancedHouse(data, houseIdx, genderIdx, currentGender) {
  let edisonCount = 0;
  let teslaCount = 0;

  const targetGender = String(currentGender).normalize('NFC').trim();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const sheetGender = String(row[genderIdx] || "").normalize('NFC').trim();
    const sheetHouse = String(row[houseIdx] || "").trim().toUpperCase(); 

    if (sheetGender === targetGender) {
      if (sheetHouse === 'EDISON') {
        edisonCount++;
      } else if (sheetHouse === 'TESLA') {
        teslaCount++;
      }
    }
  }

  console.log(`[배정체크] 신청자성별:${targetGender} | 현재상황 -> Edison:${edisonCount}명 vs Tesla:${teslaCount}명`);

  if (edisonCount < teslaCount) return 'Edison';
  if (teslaCount < edisonCount) return 'Tesla';

  return Math.random() < 0.5 ? 'Edison' : 'Tesla';
}

/**
 * JSON 응답 생성 함수
 */
function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
    
}
