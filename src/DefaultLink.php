<?php

namespace LeKoala\CmsActions;

use SilverStripe\Control\Controller;

/**
 * Create custom links on ModelAdmin
 */
trait DefaultLink
{
    /**
     * @var string
     */
    protected $link;

    /**
     * @var boolean
     */
    protected $newWindow = false;

    /**
     * Build a url to call an action on current model
     *
     * Takes into account ModelAdmin current model and set some defaults parameters
     * to send along
     *
     * If you want to call actions on the controller (ModelAdmin), use getControllerLink
     *
     * @param string $action
     * @param array<mixed>|null $params
     * @return string
     */
    public function getModelLink($action, array $params = null)
    {
        if ($params === null) {
            $params = [];
        }

        $params = array_merge(['CustomLink' => $action], $params);

        $ctrl = Controller::curr();
        $request = $ctrl->getRequest();
        $url = $request->getURL();
        if (!$url) {
            return $this->getControllerLink($action, $params);
        }

        $dirParts = explode('/', $url);
        // replace the current action if it's not an ID
        if (!is_numeric(end($dirParts))) {
            array_pop($dirParts);
        }

        $dirParts[] = 'doCustomLink';

        $action = implode('/', $dirParts);
        if (!empty($params)) {
            $action .= '?' . http_build_query($params);
        }

        return $action;
    }

    /**
     * Build an url for the current controller and pass along some parameters
     *
     * If you want to call actions on a model, use getModelLink
     *
     * @param string $action
     * @param array|null $params
     * @return string
     */
    public function getControllerLink($action, array $params = null)
    {
        if ($params === null) {
            $params = [];
        }
        $ctrl = Controller::curr();
        $request = $ctrl->getRequest();
        $modelClass = $request->param('ModelClass');
        if ($modelClass) {
            $allParams = $request->allParams();
            $action = sprintf('%s/%s', $modelClass, $action);
            $params = array_merge($allParams, $params);
        }
        if (!empty($params)) {
            $action .= '?' . http_build_query($params);
        }

        return $ctrl->Link($action);
    }

    /**
     * Get the value of link
     * @return string
     */
    public function getLink()
    {
        return $this->link;
    }

    /**
     * Set the value of link
     *
     * @param string $link
     * @return $this
     */
    public function setLink($link)
    {
        $this->link = $link;

        return $this;
    }

    /**
     * Get the value of newWindow
     * @return bool
     */
    public function getNewWindow()
    {
        return $this->newWindow;
    }

    /**
     * Set the value of newWindow
     *
     * @param bool $newWindow
     * @return $this
     */
    public function setNewWindow($newWindow)
    {
        $this->newWindow = $newWindow;

        return $this;
    }
}
