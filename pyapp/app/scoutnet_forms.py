import logging

from .scoutnet import ProjectCache, ProjectData

logger = logging.getLogger(__name__)


# --- The long (but fast) Scoutnet forms decoder ---


def scoutnet_forms_decoder(project_data: ProjectData, cache: ProjectCache) -> None:
    scout_groups = {}
    participants = {}

    # Start with participant data. Service team comes further down
    qdata = project_data.participant_group_questions["questions"]  #  All group and participants questions
    sex_values = project_data.participant_response["labels"]["sex"]

    # Loop through all participants answers, create and append answers accordning to question type
    sections = {
        s["id"]: s["title"] for s in project_data.participant_group_questions["sections"]["group_member"].values()
    }
    pdata = project_data.participant_response["participants"]
    logger.debug("Processing %s participants", len(pdata))
    for p in pdata.values():
        if not p["confirmed"]:  # Only grab confirmed participants
            continue
        group_id = p["group_registration_info"]["group_id"]
        if group_id not in scout_groups:  # Create an empty group record
            scout_groups[group_id] = {
                "id": group_id,
                "name": p["group_registration_info"]["group_name"],
                "num_participants": 0,
                "stats": {"Kön": {}},
            }

        participants[p["member_no"]] = {  # Add responder participants list
            "name": f"{p['first_name']} {p['last_name']}",
            "born": p["date_of_birth"],
            "member_group": p["primary_membership_info"]["group_id"] if p["primary_membership_info"] else group_id,
            "registration_group": group_id,
        }
        if p["date_of_birth"] < "2008-07-25":  # Over 18, also add contact info
            participants[p["member_no"]].update(
                {"email": p["primary_email"], "mobile": p["contact_info"].get("1") if p["contact_info"] else None}
            )
        # Start adding up information
        group = scout_groups[group_id]
        group["num_participants"] += 1
        sex = sex_values[p["sex"]]
        if sex not in group["stats"]["Kön"]:
            group["stats"]["Kön"][sex] = 0
        group["stats"]["Kön"][sex] += 1

        if p["questions"]:  # We have a response
            for qnum, qval in p["questions"].items():  # Loop through all responses
                q = qdata[qnum]
                qtext = q["question"]
                section = sections[q["section_id"]]
                if section not in group["stats"]:
                    group["stats"][section] = {}
                group_section = group["stats"][section]

                if q["type"] == "boolean":
                    if q["choices"][qval]["option"] == "checked":
                        if qtext not in group_section:
                            group_section[qtext] = 0
                        group_section[qtext] += 1

                elif q["type"] == "choice":
                    if qtext not in group_section:
                        group_section[qtext] = {}
                    if qval not in q["choices"]:
                        continue  # If nothing is selected?
                    seltext = q["choices"][qval]["option"]
                    if seltext not in group_section[qtext]:
                        group_section[qtext][seltext] = 0
                    group_section[qtext][seltext] += 1

                elif q["type"] == "text":
                    if (
                        not section == "Hälsa"
                        and qval
                        and qval.lower() not in ["no", "none", "n/a", "na", "n/a`", "ingen", "-"]
                    ):
                        if qtext not in group_section:
                            group_section[qtext] = []
                        group_section[qtext].append(qval)

                else:
                    logger.info("Unhandled question type: %s", q["type"])

    # Loop throgh all group answers and update group information
    sections = {s["id"]: s["title"] for s in project_data.participant_group_questions["sections"]["group"].values()}
    gdata = project_data.group_response
    logger.debug("Processing %s groups", len(gdata))
    for group_id, g in gdata.items():
        group_id = int(group_id)
        if group_id not in scout_groups:  # A group response without any participant responses?
            scout_groups[group_id] = {"id": group_id, "name": g["name"], "num_participants": 0, "stats": {}}

        group = scout_groups[group_id]
        if g["questions"]:
            for qnum, qval in g["questions"].items():
                q = qdata[qnum]
                qtext = q["question"]
                section = sections[q["section_id"]]
                if section not in group["stats"]:
                    group["stats"][section] = {}
                group_section = group["stats"][section]

                if q["type"] == "boolean":
                    group_section[qtext] = "Ja" if q["choices"][qval]["option"] == "checked" else "Nej"

                elif q["type"] == "choice":
                    if qval not in q["choices"]:
                        continue  # Nothing is selected?
                    seltext = q["choices"][qval]["option"]
                    group_section[qtext] = seltext

                elif q["type"] == "text":
                    group_section[qtext] = qval

                else:
                    # print(f"Unhandled question type: {q['type']}")
                    group_section[qtext] = qval

    # Add decoded group contact if available
    for g in scout_groups.values():
        contact = g["stats"].get("Ansvariga från kåren", {}).get("Ansvarig ledare på plats")
        if contact and int(contact) in participants:
            g["contact"] = participants[int(contact)]

    # Time for the service team data
    qdata = project_data.serviceteam_questions["questions"]  #  All service team questions
    sections = {s["id"]: s["title"] for s in project_data.serviceteam_questions["sections"]["individual"].values()}
    funk_group = {
        "id": 0,
        "name": "Funktionärer",
        "num_participants": 0,
        "stats": {"Kön": {}},
    }  # Same header as participant groups
    pdata = project_data.serviceteam_response["participants"]
    logger.debug("Processing %s service team responses", len(pdata))
    sex_values = project_data.serviceteam_response["labels"]["sex"]
    pass

    for p in pdata.values():
        if not p["confirmed"]:  # Only grab confirmed participants
            continue
        participants[p["member_no"]] = {  # Add responder participants list
            "name": f"{p['first_name']} {p['last_name']}",
            "born": p["date_of_birth"],
            "member_group": p["primary_membership_info"]["group_id"] if p["primary_membership_info"] else 0,
            # "registration_group": group_id,
        }
        if p["date_of_birth"] < "2008-07-25":  # Over 18, also add contact info
            participants[p["member_no"]].update(
                {"email": p["primary_email"], "mobile": p["contact_info"].get("1") if p["contact_info"] else None}
            )

        funk_group["num_participants"] += 1
        sex = sex_values[p["sex"]]
        if sex not in funk_group["stats"]["Kön"]:
            funk_group["stats"]["Kön"][sex] = 0
        funk_group["stats"]["Kön"][sex] += 1

        if p["questions"]:
            for qnum, qval in p["questions"].items():
                if not qval:
                    continue

                q = qdata[qnum]
                qtext = q["question"]
                section = sections[q["section_id"]]
                if section not in funk_group["stats"]:
                    funk_group["stats"][section] = {}
                group_section = funk_group["stats"][section]

                if q["type"] == "boolean":
                    if q["choices"][qval]["option"] == "checked":
                        if qtext not in group_section:
                            group_section[qtext] = 0
                        group_section[qtext] += 1

                elif q["type"] == "choice":
                    if qtext not in group_section:
                        group_section[qtext] = {}
                    if type(qval) is not list:
                        qval = [qval]
                    for qsel in qval:
                        if qsel not in q["choices"]:
                            continue  # If nothing is selected?
                        seltext = q["choices"][qsel]["option"]
                        if seltext not in group_section[qtext]:
                            group_section[qtext][seltext] = 0
                        group_section[qtext][seltext] += 1

                elif q["type"] == "text":
                    if (
                        section != "Hälsa"
                        and qtext
                        not in [
                            "Övriga önskemål på arbetsuppgifter",
                            "Önskemål om personer att jobba tillsammans med:",
                            "Om du har varit i kontakt med oss innan och förbokat vad du ska jobba med i Jamboreen, vem har du varit i kontakt med och inom vilket område ska du jobba?",
                            "Vad är namnet på den nationella scoutorganisation som du tillhör?",
                        ]
                        and qval.lower() not in ["no", "none", "n/a", "na", "n/a`", "ingen", "-"]
                    ):
                        if qtext not in group_section:
                            group_section[qtext] = []
                        group_section[qtext].append(qval)

                elif q["type"] == "number":
                    if qtext not in group_section:
                        group_section[qtext] = 0
                    if float(qval) > 100:
                        pass
                    group_section[qtext] += float(qval)

                else:
                    if q["type"] != "other_unsupported_by_api":
                        logger.info('Unhandled question "%s" of type: %s', qtext, q["type"])

    # Save in cache
    cache.groups = scout_groups
    cache.participants = participants
    cache.serviceteam = funk_group
    cache.mark_updated()  # Explicit timestamp update

    return
