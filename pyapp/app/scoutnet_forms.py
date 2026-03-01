import logging

from .scoutnet import CachedGroup, CachedProject, ProjectCache, ScoutnetProjectData

logger = logging.getLogger(__name__)


# --- Grouped project decoder (has group_member + group sections) ---


def _j26_question_hack_individual(q: dict) -> None:
    if q.get("90519", None) != "61935":  # "Ålder/roll vid anmälan" is not "Jag är vårdnadshavare och anmäler mitt barn"
        q.pop("90426", None)  # Remove  "Jag samtycker till publicering av bilder på mitt barn"
    else:
        if "90426" not in q:
            q["90426"] = "0"  # count this as NO if above is true and this one does not exist in the api response.

    if q.get("88181", None) != "60136":  # "Vilken åldersgrupp eller funktion tillhör du/ditt barn?" is not "Ledare"
        for key in ("88212", "89316", "89317"):
            q.pop(key, None)  # Remove "Extra frågor för ledare"

    if q.get("90433") != "1":  # "Jag samtycker till behandling av hälsoinformation"
        for key in ("88201", "88205", "89284", "89285", "89286", "90446", "90447", "90449"):
            q.pop(key, None)  # Remove health relates responses if not consent
    if q.get("90447") != "1":  # "Är du/ditt barn allergisk mot något läkemedel?"
        q.pop("90448", None)  # Remove "Vilket/vilka läkemedel är du/ditt barn allergisk mot?"
    if q.get("89285") != "1":  # "Tar du/ditt barn någon medicin som jamboreens sjukvårdsteam bör känna till?)"
        q.pop("88213", None)  # Remove "Vilken medicin tar du/ditt barn som jamboreens sjukvårdsteam bör känna till?"
    if q.get("90449") != "1":  # "Har du/ditt barn annan allergi som jamboreens sjukvårdsteam bör känna till?"
        q.pop("90450", None)  # Remove "Beskriv din/ditt barn icke-kostrelaterade allergi"
    if q.get("89284") != "1":  # "Har du/ditt barn behov av interntransport?"
        q.pop("88190", None)  # Remove "Beskriv ditt/ditt barns behov av interntransport"
    if q.get("89286") != "1":  # "Har du/ditt barn ett medicinskt behov av elektricitet vid boplatsen?""
        q.pop("88192", None)  # Remove "Vad behöver du/ditt barn elektricitet till?"

    if q.get("90424") != "1":  # "Jag samtycker till behandling av kostinformation"
        q.pop("88199", None)  # Remove "Allergier och medicinsk specialkost"
        q.pop("89292", None)  # Remove "Kostpreferenser"
    if q.get("88199") != "1":  # "Allergier och medicinsk specialkost" take 1
        for key in ("88189", "88202", "88206", "88207", "88209", "88210", "88215"):
            q.pop(key, None)  # If not, remove related responses
    if q.get("88199") != "1":  # "Allergier och medicinsk specialkost" take 2
        for key in ("88218", "88219", "89287", "89288", "89289", "89290", "89291"):
            q.pop(key, None)  # If not, remove related responses
    if q.get("89292") != "1":  # "Kostpreferenser"
        for key in ("89293", "89294", "89295", "89296", "89297", "89298"):
            q.pop(key, None)  # If not, remove related responses

    return


def _j26_question_hack_group(q: dict) -> None:
    if q.get("88180") != "60133":  # "Transportsätt för gods is not "Gods på pall"
        for key in ("88197", "88211", "88221", "90422", "90423"):
            q.pop(key, None)  # Remove gods related responses

    return


def _decode_project(project: ScoutnetProjectData) -> CachedProject:
    participants = {}
    questions = {}
    groups: dict[int, CachedGroup] = {}
    qdata = project.questions["questions"]
    sex_values = project.participants["labels"]["sex"]
    fee_values = project.participants["labels"]["project_fee"]
    grouped_project = bool("group_member" in project.questions["sections"])

    # Build section id -> title mapping for group_member sections
    sections = {s["id"]: s["title"] for qs in project.questions["sections"].values() for s in qs.values()}

    pdata = project.participants["participants"]
    logger.debug("Processing %s participants for project %s", len(pdata), project.project_name)

    for p in pdata.values():
        if not p["confirmed"]:
            continue  # Only handle confirmed participatns

        group_id = p["group_registration_info"]["group_id"] if grouped_project else 0

        # Add responder to participants list
        participants[p["member_no"]] = {
            "name": f"{p['first_name']} {p['last_name']}",
            "born": p["date_of_birth"],
            "registration_group": group_id,
            "member_group": p["primary_membership_info"]["group_id"] if p["primary_membership_info"] else group_id,
        }
        if p["date_of_birth"] < "2008-07-25":  # Over 18, also add contact info
            participants[p["member_no"]].update(
                {"email": p["primary_email"], "mobile": p["contact_info"].get("1") if p["contact_info"] else None}
            )

        # Create new group structure if group doesn't exist
        if group_id not in groups:
            groups[group_id] = CachedGroup(
                id=group_id,
                name=p["group_registration_info"]["group_name"] if grouped_project else project.project_name,
                aggregated={"Kön": {}, "Avgift": {}},
            )

        group = groups[group_id]
        group.num_participants += 1

        # Aggregate sex
        sex = sex_values[p["sex"]]
        group.aggregated["Kön"][sex] = group.aggregated["Kön"].get(sex, 0) + 1

        # Aggregate fee values
        fee = fee_values.get(str(p["fee_id"]), "Okänd")  # Fee key is a string the values?
        group.aggregated["Avgift"][fee] = group.aggregated["Avgift"].get(fee, 0) + 1

        # Aggregate question responses
        if p["questions"]:
            _j26_question_hack_individual(p["questions"])  # Hack for error in J26 question forms
            group.raw_individual_answers[p["member_no"]] = p["questions"]  # Store raw individual responses
            for qnum, qval in p["questions"].items():
                q = qdata[qnum]
                qnum = int(qnum)
                # if qnum == 88181:
                #     pass
                section_id = q["section_id"]

                # Save all questions separately
                secq = questions.setdefault(section_id, {"text": sections[section_id], "questions": {}})["questions"]
                if qnum not in secq:
                    secq[qnum] = {"text": q["question"], "type": q["type"]}
                    if q["type"] == "choice":
                        secq[qnum]["choices"] = {c["value"]: c["option"] for c in q.get("choices", {}).values()}

                # Add response section to group
                group_section = group.aggregated.setdefault(section_id, {})

                # Check question type and handle response accordingly
                if q["type"] == "boolean":
                    if q["choices"][qval]["option"] == "checked":
                        group_section[qnum] = group_section.get(qnum, 0) + 1

                elif q["type"] == "choice":
                    choice_counts = group_section.setdefault(qnum, {})
                    if type(qval) is not list:
                        qval = [qval]
                    for qsel in qval:
                        if qsel not in q["choices"]:
                            continue
                        choice_counts[int(qsel)] = choice_counts.get(int(qsel), 0) + 1

                elif q["type"] == "text":
                    if (
                        # sections[section_id] != "Hälsa" and
                        q["question"]
                        not in [
                            "Övriga önskemål på arbetsuppgifter",
                            "Önskemål om personer att jobba tillsammans med:",
                            "Om du har varit i kontakt med oss innan och förbokat vad du ska jobba med i Jamboreen, vem har du varit i kontakt med och inom vilket område ska du jobba?",
                            "Vad är namnet på den nationella scoutorganisation som du tillhör?",
                        ]
                        and qval
                        and qval.lower() not in ["no", "none", "n/a", "na", "n/a`", "ingen", "-"]
                    ):
                        group_section.setdefault(qnum, []).append(qval)

                elif q["type"] == "number":
                    if qval:
                        # if float(qval) > 100:
                        #     pass
                        group_section[qnum] = group_section.get(qnum, 0) + float(qval)

                elif q["type"] == "other_unsupported_by_api":
                    pass
                    # logger.info('Unhandled question "%s" of type: %s', qtext, q["type"])
                else:
                    logger.info("Unhandled question type: %s", q["type"])

    # Process group-level answers
    if grouped_project:
        gdata = project.groups
        logger.debug("Processing %s group responses for project %s", len(gdata), project.project_name)

        for gid_str, g in gdata.items():
            gid = int(gid_str)
            if gid not in groups:
                groups[gid] = CachedGroup(id=gid, name=g["name"])

            group = groups[gid]
            if g["questions"]:
                _j26_question_hack_group(g["questions"])  # Hack for error in J26 question forms
                group.raw_group_answers = g["questions"]  # Store raw group answers

                # Also compute aggregated group-level answers
                for qnum, qval in g["questions"].items():
                    q = qdata[qnum]
                    qnum = int(qnum)  # Always store question numbers as ints

                    section_id = q["section_id"]
                    secq = questions.setdefault(section_id, {"text": sections[section_id], "questions": {}})[
                        "questions"
                    ]
                    if qnum not in secq:  # Save questions
                        secq[qnum] = {"text": q["question"], "type": q["type"]}
                        # if choices := q.get("choices"):
                        if q["type"] == "choice":
                            secq[qnum]["choices"] = {c["value"]: c["option"] for c in q.get("choices", {}).values()}

                    # section = sections[q["section_id"]]
                    group_section = group.aggregated.setdefault(section_id, {})

                    if q["type"] == "boolean":
                        group_section[qnum] = "Ja" if q["choices"][qval]["option"] == "checked" else "Nej"
                    elif q["type"] == "choice":
                        if qval not in q["choices"]:
                            continue
                        # group_section[qnum] = q["choices"][qval]["option"]
                        group_section[qnum] = int(qval)
                    elif q["type"] == "text":
                        group_section[qnum] = qval
                    elif q["type"] == "number":
                        group_section[qnum] = int(qval) if qval else 0
                    else:
                        group_section[qnum] = qval

    # Resolve group contacts
    for g in groups.values():
        contact = g.aggregated.get("Ansvariga från kåren", {}).get("Ansvarig ledare på plats")
        if contact and int(contact) in participants:
            g.contact = participants[int(contact)]

    return CachedProject(
        project_id=project.project_id,
        project_name=project.project_name,
        participants=participants,
        questions=questions,
        groups=dict(sorted(groups.items())),
    )


# --- Main decoder ---


def scoutnet_forms_decoder(all_project_data: list[ScoutnetProjectData], cache: ProjectCache) -> None:
    projects: dict[int, CachedProject] = {}

    for project in all_project_data:
        projects[project.project_id] = _decode_project(project)
        cache.group_map |= {
            gid: g.name for gid, g in projects[project.project_id].groups.items()
        }  # Merge project group map with existing cache
        pass

    cache.projects = projects
    cache.mark_updated()
