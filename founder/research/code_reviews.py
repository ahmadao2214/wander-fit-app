import json, glob, re, sys, random, collections, os
d = sys.argv[1]
TEAM = {"volt","teambuildr","trainheroic","plt4m","techne","peakstrength","fitfor90"}
CODES = {
 # jobs
 "J_plan":     r"\b(tells? me what to do|what to do|plan(s|ned)?|program(s|ming)?|structured?|guid(e|ance)|routine|don'?t have to think|takes the guess)",
 "J_sport":    r"\b(sports?[- ]specific|for my sport|(pre|off|in)-?season\b|season\b|tryouts?\b|athlet(e|es|ic|icism)\b|football|soccer|basketball|baseball|softball|volleyball|hockey|lacrosse|wrestl\w*|track and field|sprint(s|ing|er)?\b|vertical\b|agility|explosiv\w*)",
 "J_load":     r"\b(what weight|weights? (it )?(suggest|recommend)|suggested weight|auto-?regulat|progressive overload|progression|adjusts?|adapt(s|ive|ing)?|too (easy|hard|heavy|light)|1 ?rm|one rep max|percentage)",
 "J_log":      r"\b(log(s|ging|ged)?|track(s|ing|er)?|history|record(s|ing)?|\bprs?\b|personal (record|best))",
 "J_coach":    r"\b(my coach|coach(es|ing)?\b|trainers?\b|team\b|teammates|assigned|strength coach)",
 "J_learn":    r"\b(videos?|demo(s|nstration)?|form|technique|instruction|how to do|cues?)",
 "J_fit":      r"\b(schedule|days? (a|per) week|equipment|home gym|at home|no gym|dumbbells? only|time I have|busy)",
 "J_motivate": r"\b(motivat|consisten|streaks?|accountab|keeps? me (going|on track))",
 # pains
 "P_bug":      r"\b(crash(es|ed|ing)?|bug(s|gy)?|glitch(es|y)?|freez(e|es|ing)|lag(s|gy)?|won'?t (load|open|sync|save)|not (loading|syncing|saving)|lost (my )?(data|workouts?|progress)|sync(ing)? (issue|problem))",
 "P_price":    r"\b(pric(e|ey|ing)\b|expensive|subscription|paywall|pay(ing)? for|costs?\b|costly|refund|charged|money)",
 "P_load":     r"\b(too (easy|hard|heavy|light)|weights? (are|is|were) (wrong|off|too)|suggested weights?.{0,20}(wrong|off|too)|unrealistic|not challenging|way too)",
 "P_datalock": r"((lost|lose|loose|access to|keep) (all )?(my |the |your )?(history|logs|data|workouts|progress).{0,60}(cancel|subscri|pay|stop))|((cancel|stop|end)\w* (my )?subscription.{0,80}(history|logs|data))|\bexport",
 "P_rigid":    r"\b(can'?t (change|edit|swap|customi[sz]e|reorder|move|skip|add)|cannot (change|edit|swap|customi[sz]e|skip)|no way to (change|edit|swap|skip|customi[sz]e)|wish (i|you) could|let me (change|swap|edit|choose|skip)|option to)",
 "P_offline":  r"\b(offline|no (service|signal|wifi|wi-fi|internet|connection)|without (service|internet|wifi|connection)|cell service|bad (service|signal|connection))",
 "P_coachside":r"\b(my coach (can'?t|cannot|doesn'?t|didn'?t)|coach (side|portal|end)|(doesn'?t|didn'?t|don'?t|not) show(ing)? up|publish(ed|ing)?|assigned workouts?)",
 "P_calendar": r"\b(missed (a|the)? ?(day|workout|session)|reschedul|calendar|move (a |the )?workouts?|wrong (day|date)|today'?s date|skip(ped)? (a )?day|rest day)",
 "P_injury":   r"\b(injur(y|ed|ies)|hurt (my|myself)|tweak(ed)? my|strain(ed)? my)",
}
rx = {k: re.compile(v, re.I) for k, v in CODES.items()}
rows = []
for f in sorted(glob.glob(f"{d}/*.json")):
    for r in json.load(open(f)):
        t = (r["title"] + " . " + r["text"])
        r["codes"] = [k for k, p in rx.items() if p.search(t)]
        r["seg"] = "team" if r["app"] in TEAM else "gym"
        rows.append(r)
json.dump(rows, open(f"{d}/../coded.json", "w"))
apps = collections.Counter(r["app"] for r in rows)
print("TOTAL", len(rows), dict(apps))
def table(sub, label):
    n = len(sub); low = [r for r in sub if r["rating"] <= 2]
    print(f"\n== {label}: n={n}, 1-2 star={len(low)} ({100*len(low)/max(n,1):.0f}%)")
    for k in CODES:
        m = [r for r in sub if k in r["codes"]]
        ml = [r for r in m if r["rating"] <= 2]
        print(f"{k:12s} {len(m):4d} {100*len(m)/max(n,1):5.1f}%  share_low={100*len(ml)/max(len(m),1):5.1f}%")
table([r for r in rows if r["seg"]=="team"], "TEAM/ATHLETE apps")
table([r for r in rows if r["seg"]=="gym"], "GYM trackers")
print("\nPER APP key codes (% of app reviews): J_sport J_load J_coach P_bug P_price P_rigid P_offline P_coachside P_calendar")
for a in apps:
    sub=[r for r in rows if r["app"]==a]; n=len(sub)
    print(a.ljust(12), n, " ".join(f"{100*sum(k in r['codes'] for r in sub)/n:5.1f}" for k in ["J_sport","J_load","J_coach","P_bug","P_price","P_rigid","P_offline","P_coachside","P_calendar"]), f"avg={sum(r['rating'] for r in sub)/n:.2f}")
