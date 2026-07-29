/* =========================================================
   KIRIN 住宅ローン計算エンジン (kirin-loan-engine.js)
   -------------------------------------------------------
   住宅ローン返済シミュレーター(simulator.html)の計算ロジックを
   DOM非依存の純粋関数として抽出したもの。simulator.html自身と、
   不動産売却益計算シミュレーター(baikyaku)の両方から読み込まれ、
   「唯一の計算ロジック」として共有される。
   どちらか一方だけを直しても計算がズレることが無いよう、
   ロジックの変更は必ずこのファイルに対して行うこと。
========================================================= */
(function(global){
  'use strict';

  function ymToOffset(startYM, ym){
    const [sy, sm] = startYM.split('-').map(Number);
    const parts = ym.split('-').map(Number);
    let ey = parts[0], em = parts[1];
    if(parts.length===3 && parts[2] > 1){
      const next = new Date(ey, em-1+1, 1);
      ey = next.getFullYear(); em = next.getMonth()+1;
    }
    return (ey-sy)*12 + (em-sm);
  }

  function computeEventAppliedRates(sortedEvents, startYM, initRate){
    let cum = initRate;
    let cumPolicy = 0;
    return sortedEvents.map(s=>{
      cumPolicy = (s.policyRate!==undefined && s.policyRate!==null) ? s.policyRate : cumPolicy + s.bump;
      const offset = ymToOffset(startYM, s.ym);
      const isBeforeStart = offset < 0;
      let appliedRate = null;
      if(!isBeforeStart){
        if(s.manualRate!==undefined && s.manualRate!==null){ cum = s.manualRate; }
        else { cum = cum + s.bump; }
        appliedRate = cum;
      }
      return {event:s, offset, isBeforeStart, appliedRate, policyRate:cumPolicy};
    });
  }

  function getNextReviewMonthIndex(startYM, fromMonthIndex, reviewSet){
    const [sy, sm] = startYM.split('-').map(Number);
    for(let m=fromMonthIndex; m<fromMonthIndex+24; m++){
      const d = new Date(sy, sm-1+m, 1);
      if(reviewSet.has(d.getMonth()+1)) return m;
    }
    return fromMonthIndex;
  }

  function getRateAtMonth(targetMonthIndex, eventRatesWithExec, initRate){
    let rate = initRate;
    for(const er of eventRatesWithExec){
      if(er.executionMonthIndex>=0 && targetMonthIndex>=er.executionMonthIndex){
        rate = er.appliedRate;
      }
    }
    return Math.max(0, rate)/100/12;
  }

  function buildAppliedRateSeries(startYM, totalMonths, reviewSet, initRate, applyDelay, eventSteps){
    const sortedEvents = (eventSteps||[]).slice().sort((a,b)=> a.ym<b.ym?-1:(a.ym>b.ym?1:0));
    const eventRatesWithExec = computeEventAppliedRates(sortedEvents, startYM, initRate)
      .filter(er=>!er.isBeforeStart)
      .map(er=>{
        const reviewMonthIndex = getNextReviewMonthIndex(startYM, er.offset, reviewSet);
        return Object.assign({}, er, {executionMonthIndex: reviewMonthIndex+(applyDelay||0)});
      });
    const series = [];
    for(let m=0;m<=totalMonths;m++){
      series.push(getRateAtMonth(m, eventRatesWithExec, initRate));
    }
    return series;
  }

  // ボーナス払いの元本(円)を、入力モード(ratio/amount/perpay)から算出する。
  function computeBonusPrincipalYen(opts){
    const bonusOn = !!opts.bonusOn;
    const mode = opts.mode || 'ratio';
    const value = Number(opts.value)||0;
    const principalYen = Number(opts.principalYen)||0;
    const initRatePercent = Number(opts.initRatePercent)||0;
    const bonusMonthsCount = opts.bonusMonthsCount||0;
    const term = Number(opts.term)||0;
    if(!bonusOn) return 0;
    if(value<=0 || principalYen<=0) return 0;
    let yen;
    if(mode==='ratio'){
      yen = principalYen*value/100;
    } else if(mode==='amount'){
      yen = Math.floor(value/10)*10*10000;
    } else {
      const perPay = Math.floor(value/10)*10*10000;
      const nOcc = Math.max(0, (bonusMonthsCount||1)*term);
      if(nOcc<=0) return 0;
      const r0 = initRatePercent/100/12;
      const nPerYear = bonusMonthsCount || 2;
      const pr = Math.pow(1+r0, 12/nPerYear)-1;
      yen = pr===0 ? perPay*nOcc : perPay*(1-Math.pow(1+pr,-nOcc))/pr;
    }
    yen = Math.floor(yen/10000)*10000;
    return Math.min(principalYen, yen);
  }

  function makeBonusTracker(bonusPrincipal, bonusMonthsSet, startMonthNum, totalMonths, repayType){
    const occ = [];
    if(bonusPrincipal>0 && bonusMonthsSet && bonusMonthsSet.size>0){
      for(let m=0;m<totalMonths;m++){
        const cal = ((startMonthNum-1+m)%12)+1;
        if(bonusMonthsSet.has(cal)) occ.push(m);
      }
    }
    let balance = bonusPrincipal>0 ? bonusPrincipal : 0;
    let lastPayIdx = -1;
    let ptr = 0;
    const nPerYear = (bonusMonthsSet && bonusMonthsSet.size) ? bonusMonthsSet.size : 2;
    return {
      active: occ.length>0 && bonusPrincipal>0,
      getBalance(){ return balance; },
      step(m, monthlyRate){
        if(!this.active || balance<=0.5) return {principal:0, interest:0, payment:0};
        if(ptr<occ.length && occ[ptr]===m){
          const periodMonths = (lastPayIdx<0) ? (m+1) : (m-lastPayIdx);
          const remOcc = occ.length-ptr;
          const pr = Math.pow(1+monthlyRate, periodMonths)-1;
          let interest = balance*pr;
          let principal, installment;
          if(repayType==='equal_principal'){
            principal = balance/remOcc;
            installment = principal+interest;
          } else {
            installment = (pr===0) ? (balance/remOcc) : (balance*pr)/(1-Math.pow(1+pr,-remOcc));
            principal = installment-interest;
          }
          if(principal>balance){ principal=balance; installment=principal+interest; }
          balance -= principal;
          lastPayIdx = m;
          ptr++;
          return {principal, interest, payment: installment};
        }
        return {principal:0, interest:0, payment:0};
      },
      remainingInterest(monthlyRate){
        if(!this.active || balance<=0.5) return 0;
        const remOcc = occ.length-ptr;
        if(remOcc<=0) return 0;
        const avgPeriod = 12/nPerYear;
        const pr = Math.pow(1+monthlyRate, avgPeriod)-1;
        const inst = (pr===0) ? (balance/remOcc) : (balance*pr)/(1-Math.pow(1+pr,-remOcc));
        return Math.max(0, inst*remOcc-balance);
      }
    };
  }

  // メインの返済シミュレーション。simulator.htmlのcalculate()関数の中核ループを
  // DOM非依存の形で抽出したもの(繰り上げ返済の「比較専用ライン」機能は含まない。
  // 実際の残高推移には元々影響していなかったため)。
  //
  // params:
  //   principalYen: 借入額(円)
  //   term: 返済期間(年)
  //   repayType: 'equal_payment'(元利均等) | 'equal_principal'(元金均等)
  //   startYM: 借入開始年月 'YYYY-MM'
  //   initRate: 当初金利(%)
  //   use5yr, use125: 5年ルール・125%ルール(元利均等のみ有効)
  //   eventSteps: [{ym:'YYYY-MM-DD'|'YYYY-MM', bump:number, manualRate?:number, policyRate?:number}, ...]
  //   reviewMonths: 金利見直し月の配列(例:[4,10])。省略時は[4,10]
  //   applyDelay: 見直し月から実際に適用されるまでの遅延月数
  //   bonusOn, bonusMode('ratio'|'amount'|'perpay'), bonusValue, bonusMonths(配列 例:[6,12])
  function runLoanSimulation(params){
    const principal = Number(params.principalYen)||0;
    const term = Number(params.term)||0;
    const repayType = params.repayType || 'equal_payment';
    const startYM = params.startYM;
    const use5yr = !!params.use5yr;
    const use125 = !!params.use125;
    const initRate = Number(params.initRate)||0;
    const eventSteps = params.eventSteps || [];
    const reviewMonths = (params.reviewMonths && params.reviewMonths.length) ? params.reviewMonths : [4,10];
    const applyDelay = Number(params.applyDelay)||0;
    const bonusOn = !!params.bonusOn;
    const bonusMode = params.bonusMode || 'ratio';
    const bonusValue = Number(params.bonusValue)||0;
    const bonusMonths = params.bonusMonths || [];

    const totalMonths = Math.round(term*12);
    if(!principal || !term || !startYM) return null;

    const reviewSet = new Set(reviewMonths);
    const rateSeries = buildAppliedRateSeries(startYM, totalMonths, reviewSet, initRate, applyDelay, eventSteps);

    const labels=[], rateData=[], payPrincipalData=[], payInterestData=[],
      balancePrincipalData=[], balanceUnpaidData=[], remainingInterestData=[],
      cumPrincipalData=[], cumInterestData=[], monthlyPayData=[];

    const bonusMonthsSet = new Set(bonusMonths);
    const bonusPrincipalAll = Math.min(
      computeBonusPrincipalYen({bonusOn, mode:bonusMode, value:bonusValue, principalYen:principal, initRatePercent:initRate, bonusMonthsCount:bonusMonthsSet.size, term}),
      principal
    );
    const startMonthNum = parseInt(startYM.split('-')[1],10);
    const bonusTracker = makeBonusTracker(bonusPrincipalAll, bonusMonthsSet, startMonthNum, totalMonths, repayType);
    const mPrincipal = principal - (bonusTracker.active ? bonusPrincipalAll : 0);

    let balance = mPrincipal;
    let unpaidInterest=0, currentPayment=0, lastFixedPayment=0, totalInterest=0, totalPayment=0,
        unpaidCount=0, cumPrincipal=0, cumInterest=0, pendingPaymentRevision=null;

    const r0 = initRate/100/12;
    if(repayType==='equal_payment'){
      currentPayment = r0===0 ? (balance/totalMonths) : (balance*r0)/(1-Math.pow(1+r0,-totalMonths));
      lastFixedPayment = currentPayment;
    }

    for(let m=0;m<totalMonths;m++){
      const monthlyRate = rateSeries[m];
      const annualRate = monthlyRate*12*100;
      const [y,mm] = startYM.split('-').map(Number);
      const d = new Date(y, mm-1+m, 1);
      labels.push(`${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}`);
      rateData.push(+annualRate.toFixed(4));

      const remainingMonths = totalMonths-m;

      if(repayType==='equal_payment' && use5yr && m>0 && m%60===0 && pendingPaymentRevision!==null){
        balance += unpaidInterest;
        unpaidInterest=0;
        currentPayment = pendingPaymentRevision;
        lastFixedPayment = currentPayment;
        pendingPaymentRevision = null;
      }

      let interestPart = balance*monthlyRate;
      let principalPart=0;
      let payment = currentPayment;

      if(repayType==='equal_payment'){
        if(!use5yr){
          payment = monthlyRate===0 ? (balance/remainingMonths) : (balance*monthlyRate)/(1-Math.pow(1+monthlyRate,-remainingMonths));
        }
        if(payment<interestPart){
          unpaidInterest += (interestPart-payment);
          interestPart = payment;
          principalPart = 0;
          unpaidCount++;
        } else {
          let surplus = payment-interestPart;
          if(unpaidInterest>0){
            const clear = Math.min(surplus, unpaidInterest);
            unpaidInterest -= clear;
            surplus -= clear;
          }
          principalPart = surplus;
        }
      } else {
        principalPart = mPrincipal/totalMonths;
        payment = principalPart+interestPart;
      }

      if(balance<=principalPart){ principalPart=balance; balance=0; }
      else { balance -= principalPart; }

      monthlyPayData.push(Math.round(principalPart+interestPart));
      payPrincipalData.push(Math.round(principalPart));
      payInterestData.push(Math.round(interestPart));

      const bonusStep = bonusTracker.step(m, monthlyRate);
      cumPrincipal += principalPart + bonusStep.principal;
      cumInterest += interestPart + bonusStep.interest;

      balancePrincipalData.push(Math.round(balance + bonusTracker.getBalance()));
      balanceUnpaidData.push(Math.round(unpaidInterest));

      {
        const remMonths = totalMonths-m-1;
        const nextRate = rateSeries[m+1]!==undefined ? rateSeries[m+1] : monthlyRate;
        let futureInterest=0;
        if(remMonths>0 && balance>0){
          const pmt = nextRate>0 ? (balance*nextRate)/(1-Math.pow(1+nextRate,-remMonths)) : (balance/remMonths);
          futureInterest = Math.max(0, pmt*remMonths-balance);
        }
        futureInterest += bonusTracker.remainingInterest(nextRate);
        remainingInterestData.push(Math.round(futureInterest));
      }

      cumPrincipalData.push(Math.round(cumPrincipal));
      cumInterestData.push(Math.round(cumInterest));

      if(repayType==='equal_payment' && use5yr && (m+1)%60===0 && m+1<totalMonths){
        const remM = totalMonths-(m+1);
        const nextRate = rateSeries[m+1]!==undefined ? rateSeries[m+1] : monthlyRate;
        const effBal = balance+unpaidInterest;
        let nextPay = nextRate===0 ? (effBal/remM) : (effBal*nextRate)/(1-Math.pow(1+nextRate,-remM));
        if(use125 && nextPay>lastFixedPayment*1.25) nextPay = lastFixedPayment*1.25;
        pendingPaymentRevision = nextPay;
      }

      totalInterest += interestPart+bonusStep.interest;
      totalPayment += payment+bonusStep.payment;

      if(balance<=0 && unpaidInterest<=0 && bonusTracker.getBalance()<=0.5){
        const cutAt = m+1;
        labels.splice(cutAt); rateData.splice(cutAt); payPrincipalData.splice(cutAt);
        payInterestData.splice(cutAt); balancePrincipalData.splice(cutAt);
        balanceUnpaidData.splice(cutAt); remainingInterestData.splice(cutAt);
        cumPrincipalData.splice(cutAt); cumInterestData.splice(cutAt); monthlyPayData.splice(cutAt);
        break;
      }
    }

    const currentMonthlyPayment = monthlyPayData[0] || 0;
    let nextChangePayment=null, nextChangeLabel=null, maxPayment=0, maxPaymentLabel=null;
    const totalPayData = monthlyPayData.slice();
    for(let i=1;i<totalPayData.length;i++){
      if(totalPayData[i]>maxPayment){ maxPayment=totalPayData[i]; maxPaymentLabel=labels[i]; }
      if(nextChangePayment===null && Math.abs(totalPayData[i]-totalPayData[0])>1){
        nextChangePayment=totalPayData[i]; nextChangeLabel=labels[i];
      }
    }

    return {
      labels, rateData, payPrincipalData, payInterestData, balancePrincipalData,
      balanceUnpaidData, remainingInterestData, cumPrincipalData, cumInterestData, monthlyPayData,
      totalInterest, totalPayment, totalUnpaid: unpaidInterest, unpaidCount, principal,
      finalBalance: balance+unpaidInterest+bonusTracker.getBalance(),
      currentMonthlyPayment, nextChangePayment, nextChangeLabel, maxPayment, maxPaymentLabel
    };
  }

  // 指定した年(year)の1月時点の残高(円)。範囲外は完済(0)またはローン開始前(元本)を返す。
  function balanceAtYear(simResult, startYM, year){
    if(!simResult) return null;
    const [sy, sm] = startYM.split('-').map(Number);
    const targetIdx = (year-sy)*12 + (1-sm);
    if(targetIdx<=0) return simResult.principal;
    if(targetIdx>=simResult.balancePrincipalData.length){
      return 0; // 既に完済済み(配列がその時点で打ち切られている)
    }
    return simResult.balancePrincipalData[targetIdx];
  }

  // 指定した年月時点の残高(円)。月まで指定したい場合に使用。
  function balanceAtMonth(simResult, startYM, targetYM){
    if(!simResult) return null;
    const idx = ymToOffset(startYM, targetYM);
    if(idx<=0) return simResult.principal;
    if(idx>=simResult.balancePrincipalData.length) return 0;
    return simResult.balancePrincipalData[idx];
  }

  // 指定した年(year, 西暦)にかかった利息額(円)の合計。
  function interestForYear(simResult, year){
    if(!simResult) return 0;
    let total = 0;
    for(let i=0;i<simResult.labels.length;i++){
      const ly = Number(simResult.labels[i].split('/')[0]);
      if(ly===year) total += simResult.payInterestData[i];
    }
    return total;
  }

  global.KirinLoanEngine = {
    runLoanSimulation, balanceAtYear, balanceAtMonth, interestForYear,
    ymToOffset, computeEventAppliedRates, buildAppliedRateSeries,
    makeBonusTracker, computeBonusPrincipalYen
  };
})(typeof window !== 'undefined' ? window : globalThis);
