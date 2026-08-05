Ich möchte ein neues Projekt starten. Correctiv https://correctiv.org/) möchte eine Smartphone App für iOS und Android entwickeln. Die App soll die verschiedenen Correctiv Projekte in einer Platform vereinen und zusätzlich für zahlende Kunden Exlusiv-Inhalte bieten. Enthalten
sein soll der Feed von https://correctiv.org/

Und die Videos aus CORRECTIV im Gespräch: https://www.youtube.com/playlist?list=PL2IVZYzgpfPrwo2K0jXXNyH_hO9oOucXT, an FunFacts ist Correctiv ebenfalls beteiligt: https://www.youtube.com/@funfacts_de

aber auch Salon5 https://correctiv.org/projekte/salon5/ ihr podcast https://correctiv.org/projekte/salon5/podcasts/

CrowdNewsroom: https://crowdnewsroom.org/

und Correctiv Schweiz: https://correctiv.org/schweiz/

Oder auch Abriss Atlas: https://abriss-atlas.de/ und https://abriss-atlas.ch/

Oder der Correctiv Verlag: https://shop.correctiv.org/

Und der Faktencheck: https://correctiv.org/faktencheck/ https://www.faktenforum.org/

Zu einigen dieser Projekte liegt auch der Quellcode im Projekte Ordner: Beabee (das ist die Platform für CrowdNewsroom) und Faktenforum. Falls dir das Hilft kannst du dir den QUelcode dieser Projekte anschauen. Suche ggf. auch noch nach weiteren Correctiv-Projekten die ich vergessen habe, bedenke das die App sie alle vereinen soll.

In der Praxis werden wir dafür SSO und Anbindungen an den unterschiedlichen Projekten / Platformen entwickeln, jetzt geht es aber erst einmal um einen schicken und benutzbaren Prototype um zu zeigen wie eine solche App aussehen könnte. Das Design soll sich an dem Correctiv Branding orientieren, dazu findest du hier einen Einstieg: /home/jumplink/Projekte/Correctiv/wp-design-tokens aber möglicherweise ist es auch sinnvoll wenn du dir die webseiten direkt anschaust.

Bitte erstelle einen Plan was die App beinhalten könnte, wie sie aufgebaut sein könnte und was sie beinhalten könnte. Bei diesem Plan soll es ersteinmal nur um das Endresultat gehen, noch nicht um den Tech-Stack, den werden wir separat definieren. Lege den Plan in /home/jumplink/Projekte/Correctiv/app ab. Stelle mir dazu unterschiedliche Fragen damit wir gemeinsam die Richtung bestimmmen können in die die App gehen soll.

Da es eine Demo werden soll wie die App am Ende aussehen könnte, ziehe dir aus den QUellen die ich dir gegeben habe bitte auch Beispiele um sie in die App einzubetten, dinge die sich leicht direkt in echt einbetten lassen solen auch direkt richtig umgesetzt werden, beispiesweise der RSS Feed der Seite falls es einen gibt. Komplizierte Anbindungen werden später in echt angebunden, sollen aber jetzt erst einmal mit beispieldaten befüllt sein, die beispieldaten sollen aber nach Möglichkeit echt und authentisch sein. Berücksichtige das bei dem Plan bitte.

Super danke, ich möchte zwei unterschiedliche Umsetzungen der App machen, daher solltet du den Tech-Stack bei diesem Plan noch ignorieren, ich möchte darüber auch die Tech-Stacks miteinander vergleichen und wiegut du als sehr Leistungsstarkes Modell mit diesen arbeiten kannst.

Wir haben in /home/jumplink/Projekte/Correctiv/app ein Konzept für eine neue Prototype App, erstelle jetzt einen Umsetzungsplan in NativeScript und Vue, für Vue kannst du https://github.com/nativescript-vue/nativescript-vue auschecken um denn source code zu untersuchen falls dir das hilft. Wir haben in unserem Projekt-Order auch bereits einige Referenzen zu NativeScript Projekten an denen du dich bei Bedarf ebenfalls orienteiren kannst. Erstelle jetzt einen Umsetzungsplan um den Prototype der Correctiv App mit diesem Stack nach dem Konzept vollständig umzusetzen. Die iOS Unterstützung kannst du schonmal theoretisch mitmachen, wir können es aber auf diesem System nicht testen da wir uns auf einem Linux-System befinden, der Android Emuator aus ANdroid Studio ist aber verfügbar.

Wir haben in /home/jumplink/Projekte/Correctiv/app ein Konzept für eine neue Prototype App, was denkst du welcher Tech Stack zur Umsetzung am besten geeignet ist wenn du das übernehmen sollst? Beantworte die Frage unter Berücksichtigung deiner Traningsdaten und dem Framework welches es dir einfacher macht weil es dir schon vieles abnimmt, welcher Tech Stack wäre unter berücksichtigung dessen der beste?
