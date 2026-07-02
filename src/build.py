#!/usr/bin/env python3
# 將 styles.css + app1~6.js 內嵌成單一 HTML 檔
import pathlib
src = pathlib.Path(__file__).parent
out = src.parent / 'index.html'
css = (src / 'styles.css').read_text(encoding='utf-8')
js = '\n'.join((src / f'app{i}.js').read_text(encoding='utf-8') for i in range(1, 8))
html = f'''<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>寶傑營運管理系統 Demo</title>
<style>
{css}
</style>
</head>
<body>
<header>
  <div class="hd-left"><span class="logo">寶傑</span><div><div class="ttl">營運管理系統 Demo</div><div class="sub">維修單管理 × 配件販售 × 庫存管理（純前端模擬）</div></div></div>
  <div class="hd-right">
    <label>目前角色</label>
    <select id="roleSel" autocomplete="off" onchange="setRole(this.value)"></select>
    <button class="bell" onclick="setTab('notifs')" title="通知">🔔<span id="bellCnt" class="cnt"></span></button>
    <button class="ghost hd" onclick="openGuide()">📖 流程指南</button>
    <button class="ghost hd" onclick="resetDemo()">重置示範資料</button>
  </div>
</header>
<nav id="tabs"></nav>
<main id="view"></main>
<div id="overlay" class="overlay" style="display:none" onclick="if(event.target===this)closeModal()">
  <div class="modal"><button class="mclose" onclick="closeModal()">✕</button><div id="modalBody"></div></div>
</div>
<script>
{js}
</script>
</body>
</html>
'''
out.write_text(html, encoding='utf-8')
print(f'OK -> {out} ({out.stat().st_size:,} bytes)')
