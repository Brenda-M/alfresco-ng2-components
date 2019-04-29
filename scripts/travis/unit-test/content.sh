DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cd $DIR/../../../

AFFECTED_LIBS="$(./scripts/affected-libs.sh -gnu -b $TRAVIS_BRANCH)";
if [[ $AFFECTED_LIBS =~ "content-services$" || $TRAVIS_PULL_REQUEST == "false"  ]];
then
    ng test content-services --watch=false || exit 1;
fi;
