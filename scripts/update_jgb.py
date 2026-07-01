#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
data/market.csv の「10年国債金利（長期金利）」列を、財務省の実勢金利データ
（日次）から作った "月末営業日" の値で置き換えるスクリプト。

使い方（リポジトリのルートで実行）:
    pip install pandas requests
    python scripts/update_jgb.py

- 財務省の全期間CSV（1974年〜）を取得
- 10年列を厳密に判定して抽出
- 各月の "最後に値がある営業日"（月末営業日）を採用
- data/market.csv の年月(YYYY-MM)に一致する行の10年国債列だけ差し替え
- 他の列・書式（日経平均のカンマ等）はそのまま保持
"""

import csv
import io
import sys
import pandas as pd
import requests

MARKET_PATH = "data/market.csv"
MOF_URL = "https://www.mof.go.jp/english/policy/jgbs/reference/interest_rate/historical/jgbcme_all.csv"
# 日本語サイト版が良ければこちら:
# MOF_URL = "https://www.mof.go.jp/jgbs/reference/interest_rate/historical/jgbcme_all.csv"


def norm_col(c):
    """列名を正規化して 10年列を判定しやすくする。'10 years'/'10年'/'10' -> '10'"""
    s = str(c).strip().lower()
    for w in ("years", "year", "年", "y"):
        s = s.replace(w, "")
    return s.strip()


def fetch_jgb_month_end():
    print(f"財務省データ取得: {MOF_URL}")
    r = requests.get(MOF_URL, timeout=30)
    r.raise_for_status()
    # 文字コードは環境により shift_jis/utf-8 混在の可能性があるので両対応
    try:
        text = r.content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = r.content.decode("shift_jis", errors="replace")

    df = pd.read_csv(io.StringIO(text))
    cols = df.columns.tolist()
    print("列一覧:", cols)

    date_col = cols[0]
    ten_col = next((c for c in cols if norm_col(c) == "10"), None)
    if ten_col is None:
        # フォールバック: '10' を含む最初の列
        ten_col = next((c for c in cols if "10" in str(c)), None)
    if ten_col is None:
        raise RuntimeError("10年列が見つかりませんでした。print(cols) を見て手動指定してください。")
    print("使用する10年列 =", ten_col)

    df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
    df = df.dropna(subset=[date_col])
    df["_v"] = pd.to_numeric(df[ten_col], errors="coerce")
    df = df.dropna(subset=["_v"])              # 休場日('-'等)を除外
    df["_ym"] = df[date_col].dt.to_period("M").astype(str)

    # 各月で「値のある最後の営業日」を採用
    monthly = df.sort_values(date_col).groupby("_ym").tail(1)
    return dict(zip(monthly["_ym"], monthly["_v"]))


def fmt(v):
    # 1.845 のように最大3桁。末尾ゼロは残す（表示の一貫性のため2桁でもOK）
    return f"{v:.3f}"


def update_market(jgb_map):
    with open(MARKET_PATH, newline="", encoding="utf-8") as f:
        rows = list(csv.reader(f))

    header = rows[0]
    ym_idx = 0
    jgb_idx = next((i for i, h in enumerate(header) if "10年国債" in h), None)
    if jgb_idx is None:
        raise RuntimeError("market.csv に『10年国債』列が見つかりません。")

    updated = 0
    for r in rows[1:]:
        if len(r) <= jgb_idx:
            continue
        ym = r[ym_idx].strip()
        if ym in jgb_map:
            r[jgb_idx] = fmt(jgb_map[ym])
            updated += 1

    with open(MARKET_PATH, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
        w.writerows(rows)

    print(f"更新: {updated} 行の10年国債列を月末値に置換しました。")
    # 直近の確認
    tail = [r for r in rows[1:] if len(r) > jgb_idx][-6:]
    print("直近の10年国債（確認用）:")
    for r in tail:
        print(f"  {r[ym_idx].strip()} -> {r[jgb_idx]}")


if __name__ == "__main__":
    try:
        jgb_map = fetch_jgb_month_end()
    except Exception as e:
        print("財務省データの取得/解析に失敗:", e, file=sys.stderr)
        sys.exit(1)
    update_market(jgb_map)
    print("完了。data/market.csv を確認してコミットしてください。")
